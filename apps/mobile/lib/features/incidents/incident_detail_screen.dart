import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../shared/utils/ui_formatters.dart';
import '../../shared/widgets/app_ui.dart';
import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';
import 'data/incident_api.dart';

class IncidentDetailScreen extends StatefulWidget {
  const IncidentDetailScreen({super.key});

  @override
  State<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends State<IncidentDetailScreen> {
  final IncidentApi _incidentApi = IncidentApi();
  Future<Incident>? _incidentFuture;
  int? _incidentId;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_incidentFuture != null) return;

    final args = ModalRoute.of(context)?.settings.arguments;
    final id = args is int ? args : int.tryParse(args?.toString() ?? '');
    _incidentId = id;
    if (id != null) {
      _incidentFuture = _incidentApi.getIncidentById(id);
    }
  }

  void _retry() {
    final id = _incidentId;
    if (id == null) return;
    setState(() => _incidentFuture = _incidentApi.getIncidentById(id));
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentDestination: AppDestination.incidents,
      scrollable: true,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
      body: FutureBuilder<Incident>(
        future: _incidentFuture,
        builder: (context, snapshot) {
          if (_incidentFuture == null) {
            return const EmptyState(
              icon: Icons.link_off_rounded,
              title: 'Incidencia no seleccionada',
              message:
                  'Abre una incidencia desde el listado para ver el detalle.',
            );
          }

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const EmptyState(
              icon: Icons.sync_rounded,
              title: 'Cargando incidencia',
              message: 'Recuperando timeline y datos tecnicos.',
            );
          }

          if (snapshot.hasError) {
            return EmptyState(
              icon: Icons.error_outline_rounded,
              title: 'No se pudo cargar la incidencia',
              message: _errorMessage(snapshot.error),
              action: PrimaryButton(
                label: 'Reintentar',
                icon: Icons.refresh_rounded,
                onPressed: _retry,
              ),
            );
          }

          final incident = snapshot.data!;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextButton.icon(
                onPressed: () =>
                    Navigator.pushReplacementNamed(context, '/incidents'),
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  foregroundColor: AppColors.primary,
                ),
                icon: const Icon(Icons.arrow_back_rounded, size: 18),
                label: Text(
                  'Volver a incidencias',
                  style: AppTextStyles.label.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              _Header(incident: incident),
              const SizedBox(height: AppSpacing.lg),
              _SummaryMetrics(incident: incident),
              const SizedBox(height: AppSpacing.lg),
              _AffectedMonitorCard(incident: incident),
              const SizedBox(height: AppSpacing.lg),
              _TimelineCard(incident: incident),
              const SizedBox(height: AppSpacing.lg),
              _TechnicalCard(incident: incident),
              const SizedBox(height: AppSpacing.lg),
              _NotesCard(incident: incident),
            ],
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      incident.title.isEmpty
                          ? 'Incidencia #${incident.id}'
                          : incident.title,
                      style: AppTextStyles.display,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      incident.monitor?.target ?? 'Sin target asociado',
                      style: AppTextStyles.subtitle,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              StatusBadge(
                label: incident.isResolved ? 'Resuelta' : 'Activa',
                tone: incident.isResolved
                    ? AppStatusTone.success
                    : AppStatusTone.danger,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              StatusBadge(
                label: incident.isResolved
                    ? 'Baja prioridad'
                    : 'Alta prioridad',
                tone: incident.isResolved
                    ? AppStatusTone.warning
                    : AppStatusTone.danger,
                icon: Icons.flag_rounded,
                showDot: false,
              ),
              StatusBadge(
                label: UiFormatters.dateTime(incident.startedAt),
                tone: AppStatusTone.neutral,
                icon: Icons.schedule_rounded,
                showDot: false,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryMetrics extends StatelessWidget {
  const _SummaryMetrics({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 168,
      child: Row(
        children: [
          Expanded(
            child: MetricCard(
              label: 'Inicio',
              value: UiFormatters.time(incident.startedAt),
              subtitle: UiFormatters.date(incident.startedAt),
              icon: Icons.access_time_rounded,
              tone: AppStatusTone.primary,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: MetricCard(
              label: 'Duracion',
              value: _durationLabel(incident),
              subtitle: incident.isResolved ? 'Evento cerrado' : 'Sigue activa',
              icon: Icons.timer_outlined,
              tone: incident.isResolved
                  ? AppStatusTone.success
                  : AppStatusTone.warning,
            ),
          ),
        ],
      ),
    );
  }
}

class _AffectedMonitorCard extends StatelessWidget {
  const _AffectedMonitorCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final monitor = incident.monitor;

    return AppCard(
      onTap: monitor == null
          ? null
          : () => Navigator.pushNamed(
              context,
              '/monitor-detail',
              arguments: monitor.id,
            ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.dangerSoft,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(
              Icons.monitor_heart_rounded,
              color: AppColors.danger,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Monitor afectado', style: AppTextStyles.caption),
                const SizedBox(height: 4),
                Text(
                  monitor?.name ?? 'Monitor no disponible',
                  style: AppTextStyles.bodyStrong,
                ),
                const SizedBox(height: 4),
                Text(
                  monitor == null
                      ? 'Sin informacion adicional'
                      : 'Estado actual ${monitor.currentStatus}',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSoft,
                  ),
                ),
              ],
            ),
          ),
          if (monitor != null)
            const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
        ],
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Timeline',
            subtitle: 'Secuencia del incidente',
          ),
          const SizedBox(height: AppSpacing.lg),
          _TimelineRow(
            title: 'Incidencia abierta',
            subtitle: incident.title.isEmpty
                ? 'Fallo detectado por el sistema de checks.'
                : incident.title,
            time: UiFormatters.time(incident.startedAt),
            tone: AppStatusTone.danger,
            showDivider: incident.resolvedAt != null,
          ),
          if (incident.resolvedAt != null)
            _TimelineRow(
              title: 'Incidencia resuelta',
              subtitle: 'El monitor volvio a un estado saludable.',
              time: UiFormatters.time(incident.resolvedAt),
              tone: AppStatusTone.success,
              showDivider: false,
            )
          else
            const _TimelineRow(
              title: 'Investigacion activa',
              subtitle: 'La incidencia sigue abierta y requiere seguimiento.',
              time: 'Ahora',
              tone: AppStatusTone.warning,
              showDivider: false,
            ),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.title,
    required this.subtitle,
    required this.time,
    required this.tone,
    required this.showDivider,
  });

  final String title;
  final String subtitle;
  final String time;
  final AppStatusTone tone;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final color = tone == AppStatusTone.success
        ? AppColors.success
        : tone == AppStatusTone.warning
        ? AppColors.warning
        : AppColors.danger;
    final soft = tone == AppStatusTone.success
        ? AppColors.successSoft
        : tone == AppStatusTone.warning
        ? AppColors.warningSoft
        : AppColors.dangerSoft;

    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: soft,
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(
                tone == AppStatusTone.success
                    ? Icons.check_circle_outline_rounded
                    : tone == AppStatusTone.warning
                    ? Icons.search_rounded
                    : Icons.error_outline_rounded,
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTextStyles.bodyStrong),
                  const SizedBox(height: 4),
                  Text(subtitle, style: AppTextStyles.caption),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(time, style: AppTextStyles.caption),
          ],
        ),
        if (showDivider)
          const Padding(
            padding: EdgeInsets.only(left: 21, top: 14, bottom: 14),
            child: Divider(height: 1, color: AppColors.border),
          ),
      ],
    );
  }
}

class _TechnicalCard extends StatelessWidget {
  const _TechnicalCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final monitor = incident.monitor;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Datos tecnicos',
            subtitle: 'Contexto operativo del monitor',
          ),
          const SizedBox(height: AppSpacing.lg),
          _InfoRow(label: 'Monitor', value: monitor?.name ?? '-'),
          _InfoRow(label: 'Target', value: monitor?.target ?? '-'),
          _InfoRow(
            label: 'Codigo esperado',
            value: '${monitor?.expectedStatusCode ?? 200}',
          ),
          _InfoRow(
            label: 'Tiempo de respuesta',
            value: UiFormatters.responseTime(monitor?.lastResponseTime),
          ),
          _InfoRow(
            label: 'Frecuencia',
            value: '${monitor?.frequencySeconds ?? 60}s',
            showDivider: false,
          ),
        ],
      ),
    );
  }
}

class _NotesCard extends StatelessWidget {
  const _NotesCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final note = incident.isResolved
        ? 'Incidencia resuelta el ${UiFormatters.dateTime(incident.resolvedAt)}.'
        : 'Incidencia activa. Revisar logs, checks y dependencias del servicio.';

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(title: 'Notas', subtitle: 'Resumen operativo'),
          const SizedBox(height: AppSpacing.md),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceSoft,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(note, style: AppTextStyles.body),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.showDivider = true,
  });

  final String label;
  final String value;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: Text(label, style: AppTextStyles.caption)),
            Flexible(
              child: Text(
                value,
                textAlign: TextAlign.end,
                style: AppTextStyles.bodyStrong,
              ),
            ),
          ],
        ),
        if (showDivider)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(height: 1, color: AppColors.border),
          ),
      ],
    );
  }
}

String _durationLabel(Incident incident) {
  if (incident.durationSeconds != null) {
    return UiFormatters.durationFromSeconds(incident.durationSeconds);
  }
  if (incident.startedAt == null) return '-';
  return UiFormatters.duration(DateTime.now().difference(incident.startedAt!));
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Error inesperado al consultar la API.';
}
