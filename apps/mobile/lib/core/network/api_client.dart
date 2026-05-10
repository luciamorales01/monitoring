import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../storage/token_storage.dart';

typedef SessionExpiredCallback = FutureOr<void> Function();

class ApiClient {
  ApiClient({
    http.Client? httpClient,
    TokenStorage? tokenStorage,
    String? baseUrl,
    Duration? timeout,
    SessionExpiredCallback? onSessionExpired,
  }) : _httpClient = httpClient ?? http.Client(),
       _tokenStorage = tokenStorage ?? TokenStorage(),
       _baseUrl = baseUrl ?? ApiConfig.baseUrl,
       _timeout = timeout ?? const Duration(seconds: 15),
       _onSessionExpired = onSessionExpired;

  final http.Client _httpClient;
  final TokenStorage _tokenStorage;
  final String _baseUrl;
  final Duration _timeout;
  final SessionExpiredCallback? _onSessionExpired;

  Future<bool>? _refreshRequest;

  Future<dynamic> get(String path, {Map<String, String>? queryParameters}) {
    return _request('GET', path, queryParameters: queryParameters);
  }

  Future<dynamic> post(
    String path, {
    Object? body,
    bool skipAuth = false,
    bool skipRefresh = false,
  }) {
    return _request(
      'POST',
      path,
      body: body,
      skipAuth: skipAuth,
      skipRefresh: skipRefresh,
    );
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
    bool skipAuth = false,
    bool skipRefresh = false,
  }) async {
    final uri = _buildUri(path, queryParameters);

    try {
      final response = await _send(method, uri, body: body, skipAuth: skipAuth);

      try {
        return _handleResponse(response);
      } on ApiException catch (error) {
        if (error.statusCode != 401 || skipAuth || skipRefresh) {
          rethrow;
        }

        final refreshed = await _refreshSession();
        if (!refreshed) {
          await _expireSession();
          rethrow;
        }

        final retriedResponse = await _send(method, uri, body: body);
        return _handleResponse(retriedResponse);
      }
    } on TimeoutException {
      throw const ApiException(message: 'La peticion ha tardado demasiado.');
    } on http.ClientException catch (error) {
      throw ApiException(message: error.message);
    }
  }

  Future<http.Response> _send(
    String method,
    Uri uri, {
    Object? body,
    bool skipAuth = false,
  }) async {
    final headers = await _headers(skipAuth: skipAuth);
    final request = http.Request(method, uri)..headers.addAll(headers);
    if (body != null) {
      request.body = jsonEncode(body);
    }

    final streamed = await _httpClient.send(request).timeout(_timeout);
    return http.Response.fromStream(streamed);
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

  Future<Map<String, String>> _headers({bool skipAuth = false}) async {
    final token = skipAuth ? null : await _tokenStorage.readToken();

    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<bool> _refreshSession() {
    final activeRefresh = _refreshRequest;
    if (activeRefresh != null) {
      return activeRefresh;
    }

    final refreshRequest = _performRefresh();
    _refreshRequest = refreshRequest;
    return refreshRequest.whenComplete(() => _refreshRequest = null);
  }

  Future<bool> _performRefresh() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      return false;
    }

    try {
      final response = await _send(
        'POST',
        _buildUri('/auth/refresh', null),
        body: {'refreshToken': refreshToken},
        skipAuth: true,
      );
      final decoded = _handleResponse(response);
      final refreshed = _RefreshSession.fromJson(_asMap(decoded));
      await _tokenStorage.saveSession(
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      );
      return true;
    } on ApiException {
      return false;
    } on TimeoutException {
      return false;
    } on http.ClientException {
      return false;
    }
  }

  Future<void> _expireSession() async {
    await _tokenStorage.clearSession();
    await _onSessionExpired?.call();
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

class _RefreshSession {
  const _RefreshSession({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;

  factory _RefreshSession.fromJson(Map<String, dynamic> json) {
    final accessToken =
        json['accessToken'] ?? json['access_token'] ?? json['token'];
    final refreshToken = json['refreshToken'] ?? json['refresh_token'];

    if (accessToken is! String || refreshToken is! String) {
      throw const ApiException(message: 'No se pudo renovar la sesion.');
    }

    return _RefreshSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
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

Map<String, dynamic> _asMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}
