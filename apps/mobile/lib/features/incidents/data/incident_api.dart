import '../../../core/network/api_client.dart';
import '../../monitors/data/monitor_api.dart';

class IncidentApi {
  IncidentApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<List<Incident>> getIncidents() async {
    final data = await _client.get('/incidents');
    return _asList(data).map(Incident.fromJson).toList();
  }

  Future<Incident> getIncidentById(int id) async {
    final data = await _client.get('/incidents/$id');
    return Incident.fromJson(_asMap(data));
  }

  Future<Incident> updateIncident(int id, Map<String, dynamic> data) async {
    final response = await _client.patch('/incidents/$id', body: data);
    return Incident.fromJson(_asMap(response));
  }
}

class Incident {
  const Incident({
    required this.id,
    required this.status,
    required this.title,
    this.startedAt,
    this.resolvedAt,
    this.durationSeconds,
    this.monitor,
  });

  final int id;
  final String status;
  final String title;
  final DateTime? startedAt;
  final DateTime? resolvedAt;
  final int? durationSeconds;
  final Monitor? monitor;

  bool get isResolved => status.toUpperCase() == 'RESOLVED';
  bool get isOpen => status.toUpperCase() == 'OPEN';

  factory Incident.fromJson(Map<String, dynamic> json) {
    return Incident(
      id: _asInt(json['id']),
      status: (json['status'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      startedAt: _asDateTime(json['startedAt']),
      resolvedAt: _asDateTime(json['resolvedAt']),
      durationSeconds: _asNullableInt(json['durationSeconds']),
      monitor: json['monitor'] is Map
          ? Monitor.fromJson(_asMap(json['monitor']))
          : null,
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
