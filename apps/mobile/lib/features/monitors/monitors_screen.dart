import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../shared/utils/ui_formatters.dart';
import '../../shared/widgets/app_ui.dart';
import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';
import 'data/monitor_api.dart';

class MonitorsScreen extends StatefulWidget {
  const MonitorsScreen({super.key});

  @override
  State<MonitorsScreen> createState() => _MonitorsScreenState();
}

class _MonitorsScreenState extends State<MonitorsScreen> {
  final MonitorApi _monitorApi = MonitorApi();
  final TextEditingController _searchController = TextEditingController();
  late Future<List<Monitor>> _monitorsFuture;
  String _searchQuery = '';
  int _selectedFilter = 0;

  @override
  void initState() {
    super.initState();
    _monitorsFuture = _monitorApi.getMonitors();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _retry() {
    setState(() => _monitorsFuture = _monitorApi.getMonitors());
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentDestination: AppDestination.monitors,
      scrollable: true,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
      body: FutureBuilder<List<Monitor>>(
        future: _monitorsFuture,
        builder: (context, snapshot) {
          final monitors = snapshot.data ?? const <Monitor>[];
          final filteredMonitors = _visibleMonitors(monitors);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AppPageHeader(
                title: 'Monitores',
                subtitle: 'Busqueda, estado y acceso rapido a cada servicio.',
              ),
              const SizedBox(height: AppSpacing.lg),
              _SearchField(
                controller: _searchController,
                onChanged: (value) => setState(() => _searchQuery = value),
              ),
              const SizedBox(height: AppSpacing.md),
              _FilterRow(
                monitors: monitors,
                selectedIndex: _selectedFilter,
                onChanged: (value) => setState(() => _selectedFilter = value),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (snapshot.connectionState == ConnectionState.waiting)
                const EmptyState(
                  icon: Icons.sync_rounded,
                  title: 'Cargando monitores',
                  message: 'Recuperando servicios y estado actual.',
                )
              else if (snapshot.hasError)
                EmptyState(
                  icon: Icons.error_outline_rounded,
                  title: 'No se pudieron cargar los monitores',
                  message: _errorMessage(snapshot.error),
                  action: PrimaryButton(
                    label: 'Reintentar',
                    icon: Icons.refresh_rounded,
                    onPressed: _retry,
                  ),
                )
              else if (filteredMonitors.isEmpty)
                const EmptyState(
                  icon: Icons.search_off_rounded,
                  title: 'Sin resultados',
                  message: 'Ajusta la busqueda o cambia el filtro de estado.',
                )
              else
                Column(
                  children: filteredMonitors.map((monitor) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: MonitorCard(
                        data: MonitorCardData(
                          id: monitor.id,
                          name: monitor.name.isEmpty
                              ? 'Monitor sin nombre'
                              : monitor.name,
                          url: monitor.target,
                          statusLabel: _statusLabel(monitor),
                          statusTone: _statusTone(monitor),
                          uptime: _uptimeValue(monitor),
                          responseTime: UiFormatters.responseTime(
                            monitor.lastResponseTime,
                          ),
                          lastCheck: UiFormatters.relativeTime(
                            monitor.lastCheckedAt,
                          ),
                          helper: monitor.type,
                        ),
                        actionLabel: 'Abrir',
                        onAction: () => Navigator.pushNamed(
                          context,
                          '/monitor-detail',
                          arguments: monitor.id,
                        ),
                        onTap: () => Navigator.pushNamed(
                          context,
                          '/monitor-detail',
                          arguments: monitor.id,
                        ),
                      ),
                    );
                  }).toList(),
                ),
            ],
          );
        },
      ),
    );
  }

  List<Monitor> _visibleMonitors(List<Monitor> monitors) {
    return monitors.where((monitor) {
      final query = _searchQuery.trim().toLowerCase();
      final matchesQuery =
          query.isEmpty ||
          monitor.name.toLowerCase().contains(query) ||
          monitor.target.toLowerCase().contains(query);

      if (!matchesQuery) {
        return false;
      }

      switch (_selectedFilter) {
        case 1:
          return _isOnline(monitor);
        case 2:
          return _isProblem(monitor);
        case 3:
          return !monitor.isActive;
        case 4:
          return _isPending(monitor);
        default:
          return true;
      }
    }).toList();
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      decoration: const InputDecoration(
        prefixIcon: Icon(Icons.search_rounded),
        hintText: 'Buscar por nombre o URL',
      ),
    );
  }
}

class _FilterRow extends StatelessWidget {
  const _FilterRow({
    required this.monitors,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<Monitor> monitors;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final filters = [
      _FilterChipData('Todos', monitors.length),
      _FilterChipData('Online', monitors.where(_isOnline).length),
      _FilterChipData('Problema', monitors.where(_isProblem).length),
      _FilterChipData(
        'Pausado',
        monitors.where((item) => !item.isActive).length,
      ),
      _FilterChipData('Pendiente', monitors.where(_isPending).length),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(filters.length, (index) {
          final filter = filters[index];
          final selected = index == selectedIndex;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.xs),
            child: InkWell(
              onTap: () => onChanged(index),
              borderRadius: BorderRadius.circular(AppRadius.pill),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  border: Border.all(
                    color: selected ? AppColors.primary : AppColors.border,
                  ),
                ),
                child: Text(
                  '${filter.label} (${filter.count})',
                  style: AppTextStyles.label.copyWith(
                    color: selected ? Colors.white : AppColors.textSoft,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _FilterChipData {
  const _FilterChipData(this.label, this.count);

  final String label;
  final int count;
}

bool _isOnline(Monitor monitor) {
  return monitor.isActive && monitor.currentStatus.toUpperCase() == 'UP';
}

bool _isProblem(Monitor monitor) {
  return monitor.isActive && monitor.currentStatus.toUpperCase() == 'DOWN';
}

bool _isPending(Monitor monitor) {
  return monitor.isActive && !_isOnline(monitor) && !_isProblem(monitor);
}

String _statusLabel(Monitor monitor) {
  if (!monitor.isActive) return 'Pausado';
  if (_isOnline(monitor)) return 'Online';
  if (_isProblem(monitor)) return 'Problema';
  return 'Pendiente';
}

AppStatusTone _statusTone(Monitor monitor) {
  if (!monitor.isActive) return AppStatusTone.paused;
  if (_isOnline(monitor)) return AppStatusTone.success;
  if (_isProblem(monitor)) return AppStatusTone.danger;
  return AppStatusTone.warning;
}

String _uptimeValue(Monitor monitor) {
  if (_isOnline(monitor)) return '100%';
  if (_isProblem(monitor)) return '0%';
  return '-';
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Error inesperado al consultar la API.';
}
