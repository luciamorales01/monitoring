import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../storage/token_storage.dart';

class ApiClient {
  ApiClient({
    http.Client? httpClient,
    TokenStorage? tokenStorage,
    String? baseUrl,
    Duration? timeout,
  }) : _httpClient = httpClient ?? http.Client(),
       _tokenStorage = tokenStorage ?? TokenStorage(),
       _baseUrl = baseUrl ?? ApiConfig.baseUrl,
       _timeout = timeout ?? const Duration(seconds: 15);

  final http.Client _httpClient;
  final TokenStorage _tokenStorage;
  final String _baseUrl;
  final Duration _timeout;

  Future<dynamic> get(String path, {Map<String, String>? queryParameters}) {
    return _request('GET', path, queryParameters: queryParameters);
  }

  Future<dynamic> post(String path, {Object? body}) {
    return _request('POST', path, body: body);
  }

  Future<dynamic> patch(String path, {Object? body}) {
    return _request('PATCH', path, body: body);
  }

  Future<dynamic> delete(String path) {
    return _request('DELETE', path);
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Object? body,
    Map<String, String>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters);
    final headers = await _headers();

    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) {
        request.body = jsonEncode(body);
      }

      final streamed = await _httpClient.send(request).timeout(_timeout);
      final response = await http.Response.fromStream(streamed);

      return _handleResponse(response);
    } on TimeoutException {
      throw const ApiException(message: 'La peticion ha tardado demasiado.');
    } on http.ClientException catch (error) {
      throw ApiException(message: error.message);
    }
  }

  Uri _buildUri(String path, Map<String, String>? queryParameters) {
    final normalizedBaseUrl = _baseUrl.endsWith('/')
        ? _baseUrl.substring(0, _baseUrl.length - 1)
        : _baseUrl;
    final normalizedPath = path.startsWith('/') ? path : '/$path';

    return Uri.parse(
      '$normalizedBaseUrl$normalizedPath',
    ).replace(queryParameters: queryParameters);
  }

  Future<Map<String, String>> _headers() async {
    final token = await _tokenStorage.readToken();

    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  dynamic _handleResponse(http.Response response) {
    final decoded = _decode(response.body);
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return decoded;
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: _extractMessage(decoded) ?? 'Error HTTP ${response.statusCode}',
      details: decoded,
    );
  }

  dynamic _decode(String body) {
    if (body.isEmpty) {
      return null;
    }

    try {
      return jsonDecode(body);
    } on FormatException {
      return body;
    }
  }

  String? _extractMessage(dynamic decoded) {
    if (decoded is Map<String, dynamic>) {
      final message = decoded['message'];
      if (message is String) return message;
      if (message is List) return message.join(', ');
      final error = decoded['error'];
      if (error is String) return error;
    }

    if (decoded is String && decoded.isNotEmpty) {
      return decoded;
    }

    return null;
  }
}

class ApiException implements Exception {
  const ApiException({this.statusCode, required this.message, this.details});

  final int? statusCode;
  final String message;
  final dynamic details;

  @override
  String toString() => message;
}
