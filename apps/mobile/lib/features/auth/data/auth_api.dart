import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';

class AuthApi {
  AuthApi({ApiClient? client, TokenStorage? tokenStorage}) {
    _tokenStorage = tokenStorage ?? TokenStorage();
    _client = client ?? ApiClient(tokenStorage: _tokenStorage);
  }

  late final ApiClient _client;
  late final TokenStorage _tokenStorage;

  Future<AuthSession> login(String email, String password) async {
    final data = await _client.post(
      '/auth/login',
      body: {'email': email, 'password': password},
    );
    final session = AuthSession.fromJson(_asMap(data));
    await _tokenStorage.saveToken(session.accessToken);
    return session;
  }

  Future<AuthSession> register({
    required String name,
    required String email,
    required String password,
    required String organizationName,
  }) async {
    final data = await _client.post(
      '/auth/register',
      body: {
        'name': name,
        'email': email,
        'password': password,
        'organizationName': organizationName,
      },
    );
    final session = AuthSession.fromJson(_asMap(data));
    await _tokenStorage.saveToken(session.accessToken);
    return session;
  }

  Future<UserProfile> me() async {
    final data = await _client.get('/auth/me');
    return UserProfile.fromJson(_asMap(data));
  }

  Future<void> logout() {
    return _tokenStorage.clearToken();
  }
}

class AuthSession {
  const AuthSession({required this.accessToken, required this.user});

  final String accessToken;
  final UserProfile user;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final token = json['accessToken'] ?? json['access_token'] ?? json['token'];

    return AuthSession(
      accessToken: token as String,
      user: UserProfile.fromJson(_asMap(json['user'])),
    );
  }
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.organizationId,
    this.organization,
  });

  final int id;
  final String name;
  final String email;
  final String role;
  final int organizationId;
  final UserOrganization? organization;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: _asInt(json['id']),
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      organizationId: _asInt(json['organizationId']),
      organization: json['organization'] is Map<String, dynamic>
          ? UserOrganization.fromJson(_asMap(json['organization']))
          : null,
    );
  }
}

class UserOrganization {
  const UserOrganization({
    required this.id,
    required this.name,
    required this.slug,
  });

  final int id;
  final String name;
  final String slug;

  factory UserOrganization.fromJson(Map<String, dynamic> json) {
    return UserOrganization(
      id: _asInt(json['id']),
      name: (json['name'] ?? '').toString(),
      slug: (json['slug'] ?? '').toString(),
    );
  }
}

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
