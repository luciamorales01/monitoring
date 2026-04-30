import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../shared/utils/ui_formatters.dart';
import '../../shared/widgets/app_ui.dart';
import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';
import 'data/monitor_api.dart';

class MonitorDetailScreen extends StatefulWidget {
  const MonitorDetailScreen({super.key});

  @override
  State<MonitorDetailScreen> createState() => _MonitorDetailScreenState();
}

class _MonitorDetailScreenState extends State<MonitorDetailScreen> {
  final MonitorApi _monitorApi = MonitorApi();
  Future<Monitor>? _monitorFuture;
  int? _monitorId;
  int _selectedTab = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_monitorFuture != null) return;

    final args = ModalRoute.of(context)?.settings.arguments;
    final id = args is int ? args : int.tryParse(args?.toString() ?? '');
    _monitorId = id;
    if (id != null) {
      _monitorFuture = _monitorApi.getMonitorById(id);
    }
  }

  void _retry() {
    final id = _monitorId;
    if (id == null) return;
    setState(() => _monitorFuture = _monitorApi.getMonitorById(id));
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentDestination: AppDestination.monitors,
      body: FutureBuilder<Monitor>(
        future: _monitorFuture,
        builder: (context, snapshot) {
          if (_monitorFuture == null) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: EmptyState(
                  icon: Icons.link_off_rounded,
                  title: 'Monitor no seleccionado',
                  message:
                      'Abre un monitor desde la lista para ver el detalle.',
                ),
              ),
            );
          }

          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: EmptyState(
                  icon: Icons.sync_rounded,
                  title: 'Cargando monitor',
                  message: 'Preparando resumen, checks e incidencias.',
                ),
              ),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: EmptyState(
                  icon: Icons.error_outline_rounded,
                  title: 'No se pudo cargar el monitor',
                  message: _errorMessage(snapshot.error),
                  action: PrimaryButton(
                    label: 'Reintentar',
                    icon: Icons.refresh_rounded,
                    onPressed: _retry,
                  ),
                ),
              ),
            );
          }

          final monitor = snapshot.data!;

          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _TopBar(
                        onBack: () => Navigator.pushReplacementNamed(
                          context,
                          '/monitors',
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _MonitorHeader(monitor: monitor),
                      const SizedBox(height: AppSpacing.lg),
                      _MetricStrip(monitor: monitor),
                      const SizedBox(height: AppSpacing.lg),
                      _Tabs(
                        selectedIndex: _selectedTab,
                        onChanged: (value) {
                          setState(() => _selectedTab = value);
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      _TabContent(monitor: monitor, selectedTab: _selectedTab),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onBack,
      style: TextButton.styleFrom(
        padding: EdgeInsets.zero,
        foregroundColor: AppColors.primary,
      ),
      icon: const Icon(Icons.arrow_back_rounded, size: 18),
      label: Text(
        'Volver a monitores',
        style: AppTextStyles.label.copyWith(
          color: AppColors.primary,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _MonitorHeader extends StatelessWidget {
  const _MonitorHeader({required this.monitor});

  final Monitor monitor;

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
                      monitor.name.isEmpty
                          ? 'Monitor sin nombre'
                          : monitor.name,
                      style: AppTextStyles.display,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(monitor.target, style: AppTextStyles.subtitle),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              StatusBadge(
                label: _statusLabel(monitor),
                tone: _statusTone(monitor),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              StatusBadge(
                label: monitor.type,
                tone: AppStatusTone.primary,
                icon: Icons.language_rounded,
                showDot: false,
              ),
              StatusBadge(
                label:
                    'Ultimo check ${UiFormatters.relativeTime(monitor.lastCheckedAt)}',
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

class _MetricStrip extends StatelessWidget {
  const _MetricStrip({required this.monitor});

  final Monitor monitor;

  @override
  Widget build(BuildContext context) {
    final failedChecks = monitor.checkResults
        .where((check) => check.status.toUpperCase() == 'DOWN')
        .length;

    return SizedBox(
      height: 168,
      child: Row(
        children: [
          Expanded(
            child: MetricCard(
              label: 'Estado',
              value: _statusLabel(monitor),
              subtitle: 'Estado actual',
              icon: Icons.favorite_rounded,
              tone: _statusTone(monitor),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: MetricCard(
              label: 'Respuesta',
              value: UiFormatters.responseTime(monitor.lastResponseTime),
              subtitle: 'Ultima medicion',
              icon: Icons.speed_rounded,
              tone: AppStatusTone.primary,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: MetricCard(
              label: 'Checks fallidos',
              value: '$failedChecks',
              subtitle: 'Historial reciente',
              icon: Icons.error_outline_rounded,
              tone: failedChecks > 0
                  ? AppStatusTone.danger
                  : AppStatusTone.success,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  const _Tabs({required this.selectedIndex, required this.onChanged});

  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    const labels = ['Resumen', 'Checks', 'Incidencias'];
    return Row(
      children: List.generate(labels.length, (index) {
        final selected = selectedIndex == index;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              right: index == labels.length - 1 ? 0 : AppSpacing.xs,
            ),
            child: InkWell(
              onTap: () => onChanged(index),
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary : AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: selected ? AppColors.primary : AppColors.border,
                  ),
                ),
                child: Center(
                  child: Text(
                    labels[index],
                    style: AppTextStyles.label.copyWith(
                      color: selected ? Colors.white : AppColors.textSoft,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

class _TabContent extends StatelessWidget {
  const _TabContent({required this.monitor, required this.selectedTab});

  final Monitor monitor;
  final int selectedTab;

  @override
  Widget build(BuildContext context) {
    switch (selectedTab) {
      case 1:
        return _ChecksTab(checks: monitor.checkResults);
      case 2:
        return _IncidentsTab(monitor: monitor);
      default:
        return _SummaryTab(monitor: monitor);
    }
  }
}

class _SummaryTab extends StatelessWidget {
  const _SummaryTab({required this.monitor});

  final Monitor monitor;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const _ChartCard(
          title: 'Disponibilidad',
          subtitle: 'Variacion estimada de las ultimas 24 horas.',
          tone: AppStatusTone.primary,
        ),
        const SizedBox(height: AppSpacing.lg),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SectionHeader(
                title: 'Configuracion',
                subtitle: 'Parametros actuales del monitor.',
              ),
              const SizedBox(height: AppSpacing.lg),
              _InfoRow(label: 'Tipo', value: monitor.type),
              _InfoRow(
                label: 'Codigo esperado',
                value: '${monitor.expectedStatusCode ?? 200}',
              ),
              _InfoRow(
                label: 'Frecuencia',
                value: '${monitor.frequencySeconds ?? 60}s',
              ),
              _InfoRow(
                label: 'Timeout',
                value: '${monitor.timeoutSeconds ?? 10}s',
                showDivider: false,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({
    required this.title,
    required this.subtitle,
    required this.tone,
  });

  final String title;
  final String subtitle;
  final AppStatusTone tone;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: title, subtitle: subtitle),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            height: 164,
            child: CustomPaint(
              painter: _SummaryChartPainter(tone: tone),
              child: const SizedBox.expand(),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChecksTab extends StatelessWidget {
  const _ChecksTab({required this.checks});

  final List<CheckResult> checks;

  @override
  Widget build(BuildContext context) {
    if (checks.isEmpty) {
      return const EmptyState(
        icon: Icons.checklist_rounded,
        title: 'Sin checks recientes',
        message: 'Cuando existan ejecuciones apareceran aqui.',
      );
    }

    return Column(
      children: checks.map((check) {
        final up = check.status.toUpperCase() == 'UP';
        final tone = up ? AppStatusTone.success : AppStatusTone.danger;
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: AppCard(
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: up ? AppColors.successSoft : AppColors.dangerSoft,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Icon(
                    up
                        ? Icons.check_circle_outline_rounded
                        : Icons.error_outline_rounded,
                    color: up ? AppColors.success : AppColors.danger,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        check.statusCode == null
                            ? check.status
                            : 'HTTP ${check.statusCode}',
                        style: AppTextStyles.bodyStrong,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        check.location ?? 'Ubicacion por defecto',
                        style: AppTextStyles.caption,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        UiFormatters.dateTime(check.checkedAt),
                        style: AppTextStyles.caption,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                StatusBadge(
                  label: UiFormatters.responseTime(check.responseTimeMs),
                  tone: tone,
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _IncidentsTab extends StatelessWidget {
  const _IncidentsTab({required this.monitor});

  final Monitor monitor;

  @override
  Widget build(BuildContext context) {
    final hasProblem = monitor.currentStatus.toUpperCase() == 'DOWN';

    return EmptyState(
      icon: hasProblem
          ? Icons.warning_amber_rounded
          : Icons.check_circle_outline_rounded,
      title: hasProblem
          ? 'Monitor con problema activo'
          : 'Sin incidencias activas',
      message: hasProblem
          ? 'Consulta la pantalla de incidencias para mas contexto operativo.'
          : 'Las incidencias relacionadas apareceran aqui cuando existan.',
      action: hasProblem
          ? PrimaryButton(
              label: 'Abrir incidencias',
              icon: Icons.arrow_forward_rounded,
              onPressed: () =>
                  Navigator.pushReplacementNamed(context, '/incidents'),
            )
          : null,
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
            Text(value, style: AppTextStyles.bodyStrong),
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

class _SummaryChartPainter extends CustomPainter {
  const _SummaryChartPainter({required this.tone});

  final AppStatusTone tone;

  @override
  void paint(Canvas canvas, Size size) {
    const leftPad = 22.0;
    const topPad = 8.0;
    const bottomPad = 18.0;
    final chartWidth = size.width - leftPad;
    final chartHeight = size.height - topPad - bottomPad;

    final gridPaint = Paint()
      ..color = AppColors.borderStrong
      ..strokeWidth = 1;

    for (int i = 0; i < 4; i++) {
      final y = topPad + chartHeight * i / 3;
      canvas.drawLine(Offset(leftPad, y), Offset(size.width, y), gridPaint);
    }

    final color = tone == AppStatusTone.danger
        ? AppColors.danger
        : tone == AppStatusTone.success
        ? AppColors.success
        : AppColors.primary;

    final linePaint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..color = color.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;

    final points = List.generate(42, (index) {
      final t = index / 41;
      final wave = 0.18 + 0.05 * math.sin(t * math.pi * 2.2);
      final dip = 0.22 * math.exp(-math.pow((t - 0.65) / 0.14, 2));
      return Offset(
        leftPad + chartWidth * t,
        topPad + chartHeight * (wave + dip),
      );
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
  bool shouldRepaint(covariant _SummaryChartPainter oldDelegate) {
    return oldDelegate.tone != tone;
  }
}

String _statusLabel(Monitor monitor) {
  if (!monitor.isActive) return 'Pausado';
  switch (monitor.currentStatus.toUpperCase()) {
    case 'UP':
      return 'Online';
    case 'DOWN':
      return 'Problema';
    default:
      return 'Pendiente';
  }
}

AppStatusTone _statusTone(Monitor monitor) {
  if (!monitor.isActive) return AppStatusTone.paused;
  switch (monitor.currentStatus.toUpperCase()) {
    case 'UP':
      return AppStatusTone.success;
    case 'DOWN':
      return AppStatusTone.danger;
    default:
      return AppStatusTone.warning;
  }
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Error inesperado al consultar la API.';
}
