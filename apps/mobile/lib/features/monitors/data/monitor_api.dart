import '../../../core/network/api_client.dart';

class MonitorApi {
  MonitorApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<List<Monitor>> getMonitors() async {
    final data = await _client.get('/monitors');
    return _asList(data).map(Monitor.fromJson).toList();
  }

  Future<Monitor> getMonitorById(int id) async {
    final data = await _client.get('/monitors/$id');
    return Monitor.fromJson(_asMap(data));
  }

  Future<Monitor> createMonitor(Map<String, dynamic> data) async {
    final response = await _client.post('/monitors', body: data);
    return Monitor.fromJson(_asMap(response));
  }

  Future<Monitor> updateMonitor(int id, Map<String, dynamic> data) async {
    final response = await _client.patch('/monitors/$id', body: data);
    return Monitor.fromJson(_asMap(response));
  }

  Future<void> deleteMonitor(int id) async {
    await _client.delete('/monitors/$id');
  }

  Future<dynamic> runCheck(int id) async {
    try {
      return await _client.post('/monitors/$id/check');
    } on ApiException catch (error) {
      if (error.statusCode == 404) {
        return _client.post('/monitors/$id/run-check');
      }
      rethrow;
    }
  }
}

class Monitor {
  const Monitor({
    required this.id,
    required this.name,
    required this.type,
    required this.target,
    required this.currentStatus,
    required this.isActive,
    this.expectedStatusCode,
    this.frequencySeconds,
    this.timeoutSeconds,
    this.lastResponseTime,
    this.lastCheckedAt,
    this.checkResults = const [],
  });

  final int id;
  final String name;
  final String type;
  final String target;
  final String currentStatus;
  final bool isActive;
  final int? expectedStatusCode;
  final int? frequencySeconds;
  final int? timeoutSeconds;
  final int? lastResponseTime;
  final DateTime? lastCheckedAt;
  final List<CheckResult> checkResults;

  factory Monitor.fromJson(Map<String, dynamic> json) {
    return Monitor(
      id: _asInt(json['id']),
      name: (json['name'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      target: (json['target'] ?? '').toString(),
      currentStatus: (json['currentStatus'] ?? 'UNKNOWN').toString(),
      isActive: json['isActive'] != false,
      expectedStatusCode: _asNullableInt(json['expectedStatusCode']),
      frequencySeconds: _asNullableInt(json['frequencySeconds']),
      timeoutSeconds: _asNullableInt(json['timeoutSeconds']),
      lastResponseTime: _asNullableInt(json['lastResponseTime']),
      lastCheckedAt: _asDateTime(json['lastCheckedAt']),
      checkResults: _asList(
        json['checkResults'],
      ).map(CheckResult.fromJson).toList(),
    );
  }
}

class CheckResult {
  const CheckResult({
    required this.id,
    required this.status,
    this.responseTimeMs,
    this.statusCode,
    this.errorMessage,
    this.location,
    this.checkedAt,
  });

  final int id;
  final String status;
  final int? responseTimeMs;
  final int? statusCode;
  final String? errorMessage;
  final String? location;
  final DateTime? checkedAt;

  factory CheckResult.fromJson(Map<String, dynamic> json) {
    return CheckResult(
      id: _asInt(json['id']),
      status: (json['status'] ?? '').toString(),
      responseTimeMs: _asNullableInt(json['responseTimeMs']),
      statusCode: _asNullableInt(json['statusCode']),
      errorMessage: json['errorMessage']?.toString(),
      location: json['location']?.toString(),
      checkedAt: _asDateTime(json['checkedAt']),
    );
  }
}

List<Map<String, dynamic>> _asList(dynamic value) {
  if (value is List) {
    return value.map(_asMap).toList();
  }
  return const [];
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

int _asInt(dynamic value) {
  return _asNullableInt(value) ?? 0;
}

int? _asNullableInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}

DateTime? _asDateTime(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}
