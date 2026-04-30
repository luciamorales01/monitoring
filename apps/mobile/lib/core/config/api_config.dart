import 'package:flutter/foundation.dart';

class ApiConfig {
  ApiConfig._();

  static const _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const _apiPath = '/api';
  static const _port = '3000';

  // Para un movil fisico, cambia esta IP por la IP local del PC en tu red.
  // Ejemplo: http://192.168.1.50:3000/api
  static const _physicalDeviceBaseUrl = 'http://IP_DEL_PC:$_port$_apiPath';

  static String get baseUrl {
    if (_configuredBaseUrl.isNotEmpty) {
      return _configuredBaseUrl;
    }

    if (kIsWeb) {
      return 'http://localhost:$_port$_apiPath';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'http://10.0.2.2:$_port$_apiPath';
      case TargetPlatform.iOS:
        return _physicalDeviceBaseUrl;
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      case TargetPlatform.fuchsia:
        return 'http://localhost:$_port$_apiPath';
    }
  }
}
