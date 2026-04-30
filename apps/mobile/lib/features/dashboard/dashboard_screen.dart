import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../monitors/data/monitor_api.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _monitorApi = MonitorApi();
  late Future<List<Monitor>> _monitorsFuture;
  final int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _monitorsFuture = _monitorApi.getMonitors();
  }

  void _retry() {
    setState(() => _monitorsFuture = _monitorApi.getMonitors());
  }

  void _onDestinationSelected(int index) {
    if (index == 0) {
      Navigator.pushReplacementNamed(context, '/dashboard');
      return;
    }

    if (index == 1) {
      Navigator.pushReplacementNamed(context, '/monitors');
      return;
    }

    if (index == 2) {
      Navigator.pushReplacementNamed(context, '/incidents');
      return;
    }

    if (index == 3) {
      Navigator.pushReplacementNamed(context, '/sections');
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      bottomNavigationBar: _BottomNav(
        currentIndex: _currentIndex,
        onDestinationSelected: _onDestinationSelected,
      ),
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 24),
          child: FutureBuilder<List<Monitor>>(
            future: _monitorsFuture,
            builder: (context, snapshot) {
              final monitors = snapshot.data ?? const <Monitor>[];

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Header(),
                  const SizedBox(height: 22),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const _InfoCard(
                      icon: Icons.sync_rounded,
                      title: 'Loading dashboard',
                      subtitle: 'Fetching live monitor data.',
                    )
                  else if (snapshot.hasError)
                    _ErrorCard(
                      message: _errorMessage(snapshot.error),
                      onRetry: _retry,
                    )
                  else ...[
                    _StatsGrid(monitors: monitors),
                    const SizedBox(height: 18),
                    const _UptimeOverviewCard(),
                    const SizedBox(height: 18),
                    _MonitorStatusSection(monitors: monitors),
                  ],
                  const SizedBox(height: 96),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Dashboard',
                style: TextStyle(
                  fontSize: 30,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF071631),
                  letterSpacing: -0.7,
                ),
              ),
              SizedBox(height: 9),
              Text(
                'Real-time monitoring overview',
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF7A8494),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        InkWell(
          onTap: () => Navigator.pushNamed(context, '/profile-settings'),
          borderRadius: BorderRadius.circular(999),
          child: Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
              ),
            ),
            child: const Text(
              'JD',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.monitors});

  final List<Monitor> monitors;

  @override
  Widget build(BuildContext context) {
    final up = monitors.where((item) => item.currentStatus == 'UP').length;
    final down = monitors.where((item) => item.currentStatus == 'DOWN').length;
    final paused = monitors.where((item) => !item.isActive).length;
    final unknown = monitors.length - up - down - paused;
    final uptime = monitors.isEmpty
        ? '0%'
        : '${(up / monitors.length * 100).toStringAsFixed(1)}%';

    final items = [
      _StatData(
        icon: Icons.trending_up_rounded,
        title: 'Uptime',
        value: uptime,
        subtitle: '${monitors.length} monitors',
        color: const Color(0xFF22C55E),
        softColor: const Color(0xFFEAFBF1),
      ),
      _StatData(
        icon: Icons.warning_amber_rounded,
        title: 'Incidents',
        value: down.toString(),
        subtitle: 'Down monitors',
        color: const Color(0xFFFF4D4F),
        softColor: const Color(0xFFFFECEF),
      ),
      _StatData(
        icon: Icons.schedule_rounded,
        title: 'Unknown',
        value: unknown.toString(),
        subtitle: 'Needs first check',
        color: const Color(0xFFFF7A1A),
        softColor: const Color(0xFFFFF1E7),
      ),
      _StatData(
        icon: Icons.pause_rounded,
        title: 'Paused',
        value: paused.toString(),
        subtitle: 'Monitoring paused',
        color: const Color(0xFF64748B),
        softColor: const Color(0xFFF1F5F9),
      ),
    ];

    return GridView.builder(
      itemCount: items.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 1.12,
      ),
      itemBuilder: (_, index) => _StatCard(data: items[index]),
    );
  }
}

class _StatCard extends StatelessWidget {
  final _StatData data;

  const _StatCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _IconBox(
                icon: data.icon,
                color: data.color,
                background: data.softColor,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  data.title,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            data.value,
            style: const TextStyle(
              fontSize: 28,
              height: 1,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 9),
          Text(
            data.subtitle,
            style: TextStyle(
              fontSize: 11,
              color: data.color,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _UptimeOverviewCard extends StatelessWidget {
  const _UptimeOverviewCard();

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Uptime Overview',
                  style: TextStyle(
                    fontSize: 17,
                    color: Color(0xFF071631),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F5F8),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Row(
                  children: [
                    _PeriodPill(text: '24h', selected: true),
                    _PeriodPill(text: '7d', selected: false),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          SizedBox(
            height: 170,
            child: CustomPaint(
              painter: _UptimeChartPainter(),
              child: const SizedBox.expand(),
            ),
          ),
        ],
      ),
    );
  }
}

class _PeriodPill extends StatelessWidget {
  final String text;
  final bool selected;

  const _PeriodPill({required this.text, required this.selected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 30,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: selected ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        boxShadow: selected
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ]
            : null,
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          color: selected ? const Color(0xFF071631) : const Color(0xFF64748B),
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _MonitorStatusSection extends StatelessWidget {
  const _MonitorStatusSection({required this.monitors});

  final List<Monitor> monitors;

  @override
  Widget build(BuildContext context) {
    final latest = monitors.isEmpty ? null : monitors.first;

    return Column(
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Monitor Status',
                style: TextStyle(
                  fontSize: 17,
                  color: Color(0xFF071631),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, '/monitors'),
              child: const Text(
                'View all',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF2563EB),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (latest == null)
          const _InfoCard(
            icon: Icons.monitor_heart_outlined,
            title: 'No monitors yet',
            subtitle: 'Create monitors in the backend to see live status.',
          )
        else
          _MonitorCard(monitor: latest),
      ],
    );
  }
}

class _MonitorCard extends StatelessWidget {
  const _MonitorCard({required this.monitor});

  final Monitor monitor;

  @override
  Widget build(BuildContext context) {
    final status = _statusData(monitor);

    return InkWell(
      onTap: () => Navigator.pushNamed(
        context,
        '/monitor-detail',
        arguments: monitor.id,
      ),
      borderRadius: BorderRadius.circular(22),
      child: _Card(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: status.color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    monitor.name,
                    style: const TextStyle(
                      fontSize: 17,
                      color: Color(0xFF071631),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: status.softColor,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    status.label,
                    style: TextStyle(
                      fontSize: 10,
                      color: status.color,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                const Expanded(
                  child: _MonitorMetric(label: 'Uptime', value: '-'),
                ),
                Expanded(
                  child: _MonitorMetric(
                    label: 'Response',
                    value: monitor.lastResponseTime == null
                        ? '-'
                        : '${monitor.lastResponseTime}ms',
                  ),
                ),
                Expanded(
                  child: _MonitorMetric(
                    label: 'Last Check',
                    value: _relativeTime(monitor.lastCheckedAt),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MonitorMetric extends StatelessWidget {
  final String label;
  final String value;

  const _MonitorMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: Color(0xFF94A3B8),
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 7),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF071631),
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.all(22),
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFF2563EB), size: 34),
          const SizedBox(height: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.all(22),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFFF4D4F),
            size: 34,
          ),
          const SizedBox(height: 12),
          const Text(
            'Could not load dashboard',
            style: TextStyle(
              fontSize: 16,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onDestinationSelected;

  const _BottomNav({
    required this.currentIndex,
    required this.onDestinationSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 78,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.black.withOpacity(0.06))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 18,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            _NavItem(
              index: 0,
              currentIndex: currentIndex,
              icon: Icons.grid_view_rounded,
              label: 'Dashboard',
              onTap: onDestinationSelected,
            ),
            _NavItem(
              index: 1,
              currentIndex: currentIndex,
              icon: Icons.monitor_heart_outlined,
              selectedIcon: Icons.monitor_heart_rounded,
              label: 'Monitors',
              onTap: onDestinationSelected,
            ),
            _NavItem(
              index: 2,
              currentIndex: currentIndex,
              icon: Icons.info_outline_rounded,
              selectedIcon: Icons.info_rounded,
              label: 'Incidents',
              onTap: onDestinationSelected,
            ),
            _NavItem(
              index: 3,
              currentIndex: currentIndex,
              icon: Icons.widgets_outlined,
              label: 'Sections',
              onTap: onDestinationSelected,
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final int index;
  final int currentIndex;
  final IconData icon;
  final IconData? selectedIcon;
  final String label;
  final ValueChanged<int> onTap;

  const _NavItem({
    required this.index,
    required this.currentIndex,
    required this.icon,
    this.selectedIcon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final selected = index == currentIndex;

    return Expanded(
      child: InkWell(
        onTap: () => onTap(index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              selected ? selectedIcon ?? icon : icon,
              size: 25,
              color: selected
                  ? const Color(0xFF2563EB)
                  : const Color(0xFF94A3B8),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: selected
                    ? const Color(0xFF2563EB)
                    : const Color(0xFF64748B),
                fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const _Card({required this.child, required this.padding});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE7EAF0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.055),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color background;

  const _IconBox({
    required this.icon,
    required this.color,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 31,
      height: 31,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, size: 18, color: color),
    );
  }
}

class _StatData {
  final IconData icon;
  final String title;
  final String value;
  final String subtitle;
  final Color color;
  final Color softColor;

  const _StatData({
    required this.icon,
    required this.title,
    required this.value,
    required this.subtitle,
    required this.color,
    required this.softColor,
  });
}

class _StatusData {
  const _StatusData({
    required this.label,
    required this.color,
    required this.softColor,
  });

  final String label;
  final Color color;
  final Color softColor;
}

class _UptimeChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const leftPad = 48.0;
    const bottomPad = 24.0;
    const topPad = 8.0;
    const rightPad = 4.0;

    final chartWidth = size.width - leftPad - rightPad;
    final chartHeight = size.height - topPad - bottomPad;

    final labelStyle = TextStyle(
      color: const Color(0xFF94A3B8),
      fontSize: 10,
      fontWeight: FontWeight.w600,
    );

    final yLabels = ['100%', '99.25%', '98.5%', '97.75%', '97%'];
    for (int i = 0; i < yLabels.length; i++) {
      final y = topPad + chartHeight * i / (yLabels.length - 1);
      _drawText(canvas, yLabels[i], Offset(0, y - 7), labelStyle);
    }

    final xLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '24:00'];
    for (int i = 0; i < xLabels.length; i++) {
      final x = leftPad + chartWidth * i / (xLabels.length - 1);
      _drawText(
        canvas,
        xLabels[i],
        Offset(x - 15, size.height - 15),
        labelStyle,
      );
    }

    final linePaint = Paint()
      ..color = const Color(0xFF2F73FF)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final points = List.generate(90, (i) {
      final t = i / 89;
      final base = 0.08 + 0.015 * math.sin(t * math.pi * 3);
      final dip = 0.45 * math.exp(-math.pow((t - 0.34) / 0.09, 2));
      final yValue = base + dip;
      return Offset(leftPad + chartWidth * t, topPad + chartHeight * yValue);
    });

    final path = Path()..moveTo(points.first.dx, points.first.dy);

    for (int i = 1; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      path.quadraticBezierTo(
        p0.dx,
        p0.dy,
        (p0.dx + p1.dx) / 2,
        (p0.dy + p1.dy) / 2,
      );
    }

    canvas.drawPath(path, linePaint);
  }

  void _drawText(Canvas canvas, String text, Offset offset, TextStyle style) {
    final painter = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
    )..layout();

    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

_StatusData _statusData(Monitor monitor) {
  if (!monitor.isActive) {
    return const _StatusData(
      label: 'Paused',
      color: Color(0xFF64748B),
      softColor: Color(0xFFF1F5F9),
    );
  }

  switch (monitor.currentStatus.toUpperCase()) {
    case 'UP':
      return const _StatusData(
        label: 'Operational',
        color: Color(0xFF16A34A),
        softColor: Color(0xFFEAFBF1),
      );
    case 'DOWN':
      return const _StatusData(
        label: 'Down',
        color: Color(0xFFFF4D4F),
        softColor: Color(0xFFFFECEF),
      );
    default:
      return const _StatusData(
        label: 'Unknown',
        color: Color(0xFFFF7A1A),
        softColor: Color(0xFFFFF1E7),
      );
  }
}

String _relativeTime(DateTime? dateTime) {
  if (dateTime == null) return 'Never';

  final diff = DateTime.now().difference(dateTime);
  if (diff.inSeconds < 60) return '${diff.inSeconds}s ago';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  return '${diff.inDays}d ago';
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Unexpected error while contacting the API.';
}
