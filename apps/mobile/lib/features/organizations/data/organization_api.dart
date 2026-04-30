import '../../../core/network/api_client.dart';

class OrganizationApi {
  OrganizationApi({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<List<Organization>> getOrganizations() async {
    final data = await _client.get('/organizations');
    return _asList(data).map(Organization.fromJson).toList();
  }
}

class Organization {
  const Organization({
    required this.id,
    required this.name,
    required this.slug,
    this.monitorCount,
  });

  final int id;
  final String name;
  final String slug;
  final int? monitorCount;

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: _asInt(json['id']),
      name: (json['name'] ?? '').toString(),
      slug: (json['slug'] ?? '').toString(),
      monitorCount: _asNullableInt(json['monitorCount']),
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
