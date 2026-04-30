import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../shared/utils/ui_formatters.dart';
import '../../shared/widgets/app_ui.dart';
import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';
import '../monitors/data/monitor_api.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final MonitorApi _monitorApi = MonitorApi();
  late Future<List<Monitor>> _monitorsFuture;

  @override
  void initState() {
    super.initState();
    _monitorsFuture = _monitorApi.getMonitors();
  }

  void _retry() {
    setState(() => _monitorsFuture = _monitorApi.getMonitors());
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentDestination: AppDestination.dashboard,
      scrollable: true,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
      body: FutureBuilder<List<Monitor>>(
        future: _monitorsFuture,
        builder: (context, snapshot) {
          final monitors = snapshot.data ?? const <Monitor>[];

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppPageHeader(
                title: 'Dashboard',
                subtitle:
                    'Vision general de disponibilidad y actividad reciente.',
                trailing: AppAvatarButton(
                  label: 'AS',
                  onPressed: () =>
                      Navigator.pushNamed(context, '/profile-settings'),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (snapshot.connectionState == ConnectionState.waiting)
                const EmptyState(
                  icon: Icons.sync_rounded,
                  title: 'Cargando dashboard',
                  message: 'Recuperando monitores y actividad reciente.',
                )
              else if (snapshot.hasError)
                EmptyState(
                  icon: Icons.error_outline_rounded,
                  title: 'No se pudo cargar el dashboard',
                  message: _errorMessage(snapshot.error),
                  action: PrimaryButton(
                    label: 'Reintentar',
                    icon: Icons.refresh_rounded,
                    onPressed: _retry,
                  ),
                )
              else ...[
                _MetricsGrid(monitors: monitors),
                const SizedBox(height: AppSpacing.lg),
                _AvailabilityCard(monitors: monitors),
                const SizedBox(height: AppSpacing.lg),
                SectionHeader(
                  title: 'Alertas recientes',
                  subtitle: 'Monitores con incidencias o sin checks recientes.',
                  actionLabel: 'Ver incidencias',
                  onAction: () =>
                      Navigator.pushReplacementNamed(context, '/incidents'),
                ),
                const SizedBox(height: AppSpacing.md),
                _RecentAlerts(monitors: monitors),
                const SizedBox(height: AppSpacing.lg),
                SectionHeader(
                  title: 'Monitores',
                  subtitle: 'Resumen rapido de tus servicios monitorizados.',
                  actionLabel: 'Ver todos',
                  onAction: () =>
                      Navigator.pushReplacementNamed(context, '/monitors'),
                ),
                const SizedBox(height: AppSpacing.md),
                _MonitorPreviewList(monitors: monitors),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.monitors});

  final List<Monitor> monitors;

  @override
  Widget build(BuildContext context) {
    final online = monitors.where(_isOnline).length;
    final problems = monitors.where(_isProblem).length;
    final paused = monitors.where((monitor) => !monitor.isActive).length;
    final pending = monitors.where(_isPending).length;

    final cards = [
      MetricCard(
        label: 'Disponibilidad',
        value: UiFormatters.percentFromRatio(online, monitors.length),
        subtitle: '${monitors.length} monitores totales',
        icon: Icons.favorite_rounded,
        tone: AppStatusTone.success,
      ),
      MetricCard(
        label: 'Problemas',
        value: '$problems',
        subtitle: 'Necesitan atencion',
        icon: Icons.warning_amber_rounded,
        tone: AppStatusTone.danger,
      ),
      MetricCard(
        label: 'Pausados',
        value: '$paused',
        subtitle: 'Checks detenidos',
        icon: Icons.pause_circle_rounded,
        tone: AppStatusTone.paused,
      ),
      MetricCard(
        label: 'Pendientes',
        value: '$pending',
        subtitle: 'Sin respuesta util',
        icon: Icons.schedule_rounded,
        tone: AppStatusTone.warning,
      ),
    ];

    return GridView.builder(
      itemCount: cards.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 0.95,
      ),
      itemBuilder: (_, index) => cards[index],
    );
  }
}

class _AvailabilityCard extends StatelessWidget {
  const _AvailabilityCard({required this.monitors});

  final List<Monitor> monitors;

  @override
  Widget build(BuildContext context) {
    final online = monitors.where(_isOnline).length;
    final problems = monitors.where(_isProblem).length;
    final paused = monitors.where((monitor) => !monitor.isActive).length;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionHeader(
            title: 'Disponibilidad',
            subtitle: 'Ultimas 24 horas',
          ),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            height: 172,
            child: CustomPaint(
              painter: _AvailabilityChartPainter(problemCount: problems),
              child: const SizedBox.expand(),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              StatusBadge(label: '$online online', tone: AppStatusTone.success),
              StatusBadge(
                label: '$problems problema',
                tone: AppStatusTone.danger,
              ),
              StatusBadge(label: '$paused pausado', tone: AppStatusTone.paused),
            ],
          ),
        ],
      ),
    );
  }
}

class _RecentAlerts extends StatelessWidget {
  const _RecentAlerts({required this.monitors});

  final List<Monitor> monitors;

  @override
  Widget build(BuildContext context) {
    final alerts = monitors
        .where((monitor) {
          return _isProblem(monitor) || _isPending(monitor);
        })
        .take(3)
        .toList();

    if (alerts.isEmpty) {
      return const EmptyState(
        icon: Icons.check_circle_outline_rounded,
        title: 'Todo bajo control',
        message: 'No hay alertas recientes en este momento.',
      );
    }

    return Column(
      children: alerts.map((monitor) {
        final tone = _statusTone(monitor);
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: AppCard(
            onTap: () => Navigator.pushNamed(
              context,
              '/monitor-detail',
              arguments: monitor.id,
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: _toneBackground(tone),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Icon(
                    tone == AppStatusTone.danger
                        ? Icons.error_outline_rounded
                        : Icons.schedule_rounded,
                    color: _toneColor(tone),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(monitor.name, style: AppTextStyles.bodyStrong),
                      const SizedBox(height: 4),
                      Text(
                        monitor.target,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.caption,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                StatusBadge(label: _statusLabel(monitor), tone: tone),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _MonitorPreviewList extends StatelessWidget {
  const _MonitorPreviewList({required this.monitors});

  final List<Monitor> monitors;

  @override
  Widget build(BuildContext context) {
    if (monitors.isEmpty) {
      return const EmptyState(
        icon: Icons.monitor_heart_outlined,
        title: 'Sin monitores',
        message: 'Cuando el backend devuelva monitores apareceran aqui.',
      );
    }

    return Column(
      children: monitors.take(3).map((monitor) {
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: MonitorCard(
            data: MonitorCardData(
              id: monitor.id,
              name: monitor.name.isEmpty ? 'Monitor sin nombre' : monitor.name,
              url: monitor.target,
              statusLabel: _statusLabel(monitor),
              statusTone: _statusTone(monitor),
              uptime: _isOnline(monitor)
                  ? '100%'
                  : _isProblem(monitor)
                  ? '0%'
                  : '-',
              responseTime: UiFormatters.responseTime(monitor.lastResponseTime),
              lastCheck: UiFormatters.relativeTime(monitor.lastCheckedAt),
              helper: monitor.type,
            ),
            actionLabel: 'Abrir detalle',
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
    );
  }
}

class _AvailabilityChartPainter extends CustomPainter {
  const _AvailabilityChartPainter({required this.problemCount});

  final int problemCount;

  @override
  void paint(Canvas canvas, Size size) {
    const leftPad = 34.0;
    const bottomPad = 24.0;
    const topPad = 6.0;
    const rightPad = 4.0;
    final chartWidth = size.width - leftPad - rightPad;
    final chartHeight = size.height - topPad - bottomPad;

    final gridPaint = Paint()
      ..color = AppColors.borderStrong
      ..strokeWidth = 1;

    for (int i = 0; i < 4; i++) {
      final y = topPad + chartHeight * (i / 3);
      canvas.drawLine(Offset(leftPad, y), Offset(size.width, y), gridPaint);
    }

    final linePaint = Paint()
      ..color = problemCount > 0 ? AppColors.warning : AppColors.primary
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..color = linePaint.color.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;

    final points = List.generate(48, (index) {
      final t = index / 47;
      final wave = 0.18 + 0.04 * math.sin(t * math.pi * 2.8);
      final dipStrength = 0.18 + (problemCount * 0.04).clamp(0.0, 0.22);
      final dip = dipStrength * math.exp(-math.pow((t - 0.72) / 0.11, 2));
      final yValue = (wave + dip).clamp(0.05, 0.8);
      return Offset(leftPad + chartWidth * t, topPad + chartHeight * yValue);
    });

    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (int i = 1; i < points.length - 1; i++) {
      final current = points[i];
      final next = points[i + 1];
      path.quadraticBezierTo(
        current.dx,
        current.dy,
        (current.dx + next.dx) / 2,
        (current.dy + next.dy) / 2,
      );
    }

    final fillPath = Path.from(path)
      ..lineTo(points.last.dx, size.height - bottomPad)
      ..lineTo(points.first.dx, size.height - bottomPad)
      ..close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(covariant _AvailabilityChartPainter oldDelegate) {
    return oldDelegate.problemCount != problemCount;
  }
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

Color _toneColor(AppStatusTone tone) {
  switch (tone) {
    case AppStatusTone.success:
      return AppColors.success;
    case AppStatusTone.danger:
      return AppColors.danger;
    case AppStatusTone.warning:
      return AppColors.warning;
    case AppStatusTone.paused:
      return AppColors.paused;
    case AppStatusTone.primary:
      return AppColors.primary;
    case AppStatusTone.neutral:
      return AppColors.textMuted;
  }
}

Color _toneBackground(AppStatusTone tone) {
  switch (tone) {
    case AppStatusTone.success:
      return AppColors.successSoft;
    case AppStatusTone.danger:
      return AppColors.dangerSoft;
    case AppStatusTone.warning:
      return AppColors.warningSoft;
    case AppStatusTone.paused:
      return AppColors.pausedSoft;
    case AppStatusTone.primary:
      return AppColors.primarySoft;
    case AppStatusTone.neutral:
      return AppColors.surfaceSoft;
  }
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Error inesperado al consultar la API.';
}
