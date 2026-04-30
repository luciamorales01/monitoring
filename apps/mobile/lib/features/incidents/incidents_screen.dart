import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../shared/utils/ui_formatters.dart';
import '../../shared/widgets/app_ui.dart';
import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_shadows.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';
import 'data/incident_api.dart';

class IncidentsScreen extends StatefulWidget {
  const IncidentsScreen({super.key});

  @override
  State<IncidentsScreen> createState() => _IncidentsScreenState();
}

class _IncidentsScreenState extends State<IncidentsScreen> {
  final IncidentApi _incidentApi = IncidentApi();
  late Future<List<Incident>> _incidentsFuture;
  int _selectedFilter = 0;

  @override
  void initState() {
    super.initState();
    _incidentsFuture = _incidentApi.getIncidents();
  }

  void _retry() {
    setState(() => _incidentsFuture = _incidentApi.getIncidents());
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentDestination: AppDestination.incidents,
      scrollable: true,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
      body: FutureBuilder<List<Incident>>(
        future: _incidentsFuture,
        builder: (context, snapshot) {
          final incidents = snapshot.data ?? const <Incident>[];
          final active = incidents.where((item) => item.isOpen).toList();
          final history = incidents.where((item) => !item.isOpen).toList();
          final visible = _selectedFilter == 0 ? active : history;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AppPageHeader(
                title: 'Incidencias',
                subtitle:
                    'Sigue eventos activos y revisa el historial resuelto.',
              ),
              const SizedBox(height: AppSpacing.lg),
              _SegmentedControl(
                activeCount: active.length,
                historyCount: history.length,
                selectedIndex: _selectedFilter,
                onChanged: (index) {
                  setState(() => _selectedFilter = index);
                },
              ),
              const SizedBox(height: AppSpacing.lg),
              if (snapshot.connectionState == ConnectionState.waiting)
                const EmptyState(
                  icon: Icons.sync_rounded,
                  title: 'Cargando incidencias',
                  message: 'Recuperando actividad y eventos del backend.',
                )
              else if (snapshot.hasError)
                EmptyState(
                  icon: Icons.error_outline_rounded,
                  title: 'No se pudieron cargar las incidencias',
                  message: _errorMessage(snapshot.error),
                  action: PrimaryButton(
                    label: 'Reintentar',
                    icon: Icons.refresh_rounded,
                    onPressed: _retry,
                  ),
                )
              else if (visible.isEmpty)
                EmptyState(
                  icon: _selectedFilter == 0
                      ? Icons.check_circle_outline_rounded
                      : Icons.history_toggle_off_rounded,
                  title: _selectedFilter == 0
                      ? 'Sin incidencias activas'
                      : 'Sin historial',
                  message: _selectedFilter == 0
                      ? 'No hay eventos abiertos en este momento.'
                      : 'Las incidencias resueltas apareceran aqui.',
                )
              else
                Column(
                  children: visible.map((incident) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: IncidentCard(
                        data: IncidentCardData(
                          id: incident.id,
                          title: incident.title.isEmpty
                              ? 'Incidencia #${incident.id}'
                              : incident.title,
                          monitorName:
                              incident.monitor?.name ?? 'Monitor no disponible',
                          dateLabel: UiFormatters.dateTime(incident.startedAt),
                          priorityLabel: incident.isResolved ? 'Baja' : 'Alta',
                          priorityTone: incident.isResolved
                              ? AppStatusTone.warning
                              : AppStatusTone.danger,
                          statusLabel: incident.isResolved
                              ? 'Resuelta'
                              : 'Activa',
                          statusTone: incident.isResolved
                              ? AppStatusTone.success
                              : AppStatusTone.danger,
                        ),
                        onTap: () => Navigator.pushNamed(
                          context,
                          '/incident-detail',
                          arguments: incident.id,
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
}

class _SegmentedControl extends StatelessWidget {
  const _SegmentedControl({
    required this.activeCount,
    required this.historyCount,
    required this.selectedIndex,
    required this.onChanged,
  });

  final int activeCount;
  final int historyCount;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          _SegmentButton(
            label: 'Activas ($activeCount)',
            selected: selectedIndex == 0,
            onTap: () => onChanged(0),
          ),
          const SizedBox(width: AppSpacing.xs),
          _SegmentButton(
            label: 'Historial ($historyCount)',
            selected: selectedIndex == 1,
            onTap: () => onChanged(1),
          ),
        ],
      ),
    );
  }
}

class _SegmentButton extends StatelessWidget {
  const _SegmentButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(AppRadius.sm),
            boxShadow: selected ? AppShadows.soft : null,
          ),
          child: Center(
            child: Text(
              label,
              style: AppTextStyles.label.copyWith(
                color: selected ? AppColors.text : AppColors.textMuted,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Error inesperado al consultar la API.';
}
