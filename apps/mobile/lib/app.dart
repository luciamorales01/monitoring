import 'package:flutter/material.dart';

import 'features/auth/login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'styles/app_colors.dart';
import 'features/monitors/monitors_screen.dart';
import 'features/monitors/monitor_detail_screen.dart';
import 'features/incidents/incidents_screen.dart';
import 'features/incidents/incident_detail_screen.dart';
import 'features/profile/profile_settings_screen.dart';
import 'features/sections/sections_screen.dart';

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MonitoringTFG',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.background,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      routes: {
        '/': (_) => const LoginScreen(),
        '/dashboard': (_) => const DashboardScreen(),
        '/monitors': (_) => const MonitorsScreen(),
        '/monitor-detail': (_) => const MonitorDetailScreen(),
        '/incidents': (_) => const IncidentsScreen(),
        '/incident-detail': (_) => const IncidentDetailScreen(),
        '/profile-settings': (_) => const ProfileSettingsScreen(),
        '/sections': (_) => const SectionsScreen(),
      },
    );
  }
}
