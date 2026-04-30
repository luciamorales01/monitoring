import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import 'data/monitor_api.dart';

class MonitorDetailScreen extends StatefulWidget {
  const MonitorDetailScreen({super.key});

  @override
  State<MonitorDetailScreen> createState() => _MonitorDetailScreenState();
}

class _MonitorDetailScreenState extends State<MonitorDetailScreen> {
  final _monitorApi = MonitorApi();
  Future<Monitor>? _monitorFuture;
  int? _monitorId;
  final int _currentIndex = 1;
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
    final future = _monitorFuture;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      bottomNavigationBar: _BottomNav(
        currentIndex: _currentIndex,
        onDestinationSelected: _onDestinationSelected,
      ),
      body: SafeArea(
        bottom: false,
        child: future == null
            ? const _CenteredState(
                icon: Icons.link_off_rounded,
                title: 'Monitor not selected',
                subtitle: 'Open a monitor from the monitors list.',
              )
            : FutureBuilder<Monitor>(
                future: future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const _CenteredState(
                      icon: Icons.sync_rounded,
                      title: 'Loading monitor',
                      subtitle: 'Fetching monitor details from the API.',
                    );
                  }

                  if (snapshot.hasError) {
                    return _CenteredState(
                      icon: Icons.error_outline_rounded,
                      title: 'Could not load monitor',
                      subtitle: _errorMessage(snapshot.error),
                      action: ElevatedButton.icon(
                        onPressed: _retry,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Retry'),
                      ),
                    );
                  }

                  final monitor = snapshot.data!;

                  return Column(
                    children: [
                      _Header(
                        monitor: monitor,
                        selectedTab: _selectedTab,
                        onTabChanged: (index) =>
                            setState(() => _selectedTab = index),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(22, 22, 22, 96),
                          child: _TabContent(
                            monitor: monitor,
                            selectedTab: _selectedTab,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final Monitor monitor;
  final int selectedTab;
  final ValueChanged<int> onTabChanged;

  const _Header({
    required this.monitor,
    required this.selectedTab,
    required this.onTabChanged,
  });

  @override
  Widget build(BuildContext context) {
    final status = _statusData(monitor);

    return Container(
      color: const Color(0xFFF7F8FA),
      padding: const EdgeInsets.fromLTRB(22, 18, 22, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => Navigator.pushReplacementNamed(context, '/monitors'),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.arrow_back_rounded,
                  size: 18,
                  color: Color(0xFF2563EB),
                ),
                SizedBox(width: 6),
                Text(
                  'Monitors',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF2563EB),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      monitor.name,
                      style: const TextStyle(
                        fontSize: 26,
                        height: 1,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF071631),
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      monitor.target,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: status.softColor,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Row(
                  children: [
                    CircleAvatar(radius: 4, backgroundColor: status.color),
                    const SizedBox(width: 7),
                    Text(
                      status.label,
                      style: TextStyle(
                        fontSize: 12,
                        color: status.color,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 22),
          _Tabs(selectedIndex: selectedTab, onChanged: onTabChanged),
          const SizedBox(height: 14),
          const Divider(height: 1, color: Color(0xFFE7EAF0)),
        ],
      ),
    );
  }
}

class _Tabs extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const _Tabs({required this.selectedIndex, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final tabs = ['Summary', 'Checks', 'Incidents', 'History'];

    return SizedBox(
      height: 37,
      child: Row(
        children: List.generate(tabs.length, (index) {
          final selected = selectedIndex == index;

          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(index),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    tabs[index],
                    style: TextStyle(
                      fontSize: 12,
                      color: selected
                          ? const Color(0xFF2563EB)
                          : const Color(0xFF334155),
                      fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: 2,
                    width: selected ? 58 : 0,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _TabContent extends StatelessWidget {
  final Monitor monitor;
  final int selectedTab;

  const _TabContent({required this.monitor, required this.selectedTab});

  @override
  Widget build(BuildContext context) {
    switch (selectedTab) {
      case 1:
        return _ChecksTab(checks: monitor.checkResults);
      case 2:
        return const _IncidentsTab();
      case 3:
        return _HistoryTab(monitor: monitor);
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
        _SummaryMetrics(monitor: monitor),
        const SizedBox(height: 20),
        const _ChartCard(
          title: 'Uptime (Last 24h)',
          chartType: _ChartType.uptime,
        ),
        const SizedBox(height: 20),
        const _ChartCard(
          title: 'Response Time (Last 24h)',
          chartType: _ChartType.response,
        ),
      ],
    );
  }
}

class _SummaryMetrics extends StatelessWidget {
  const _SummaryMetrics({required this.monitor});

  final Monitor monitor;

  @override
  Widget build(BuildContext context) {
    final checksDown = monitor.checkResults
        .where((check) => check.status.toUpperCase() == 'DOWN')
        .length;

    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            label: 'Status',
            value: _statusData(monitor).label,
            detail: 'Current',
            color: _statusData(monitor).color,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricCard(
            label: 'Avg\nResponse',
            value: monitor.lastResponseTime == null
                ? '-'
                : '${monitor.lastResponseTime}ms',
            detail: 'Last check',
            color: const Color(0xFF071631),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricCard(
            label: 'Failed\nChecks',
            value: checksDown.toString(),
            detail: 'Recent',
            color: const Color(0xFF071631),
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String detail;
  final Color color;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.detail,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.fromLTRB(15, 16, 15, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              height: 1.2,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 20,
              height: 1,
              color: color,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 9),
          Text(
            detail,
            style: const TextStyle(
              fontSize: 10,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

enum _ChartType { uptime, response }

class _ChartCard extends StatelessWidget {
  final String title;
  final _ChartType chartType;

  const _ChartCard({required this.title, required this.chartType});

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 22),
          SizedBox(
            height: 158,
            child: CustomPaint(
              painter: _ChartPainter(chartType),
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
      return const _InlineState(
        icon: Icons.check_circle_outline_rounded,
        title: 'No checks yet',
        subtitle: 'Run a check to see recent results here.',
      );
    }

    return Column(
      children: checks
          .map(
            (check) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _CheckCard(check: check),
            ),
          )
          .toList(),
    );
  }
}

class _CheckCard extends StatelessWidget {
  final CheckResult check;

  const _CheckCard({required this.check});

  @override
  Widget build(BuildContext context) {
    final up = check.status.toUpperCase() == 'UP';
    final color = up ? const Color(0xFF22C55E) : const Color(0xFFFF4D4F);
    final soft = up ? const Color(0xFFEAFBF1) : const Color(0xFFFFECEF);

    return _Card(
      padding: const EdgeInsets.fromLTRB(18, 17, 18, 17),
      child: Row(
        children: [
          Container(
            width: 39,
            height: 39,
            decoration: BoxDecoration(
              color: soft,
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(
              up ? Icons.check_circle_outline_rounded : Icons.cancel_outlined,
              color: color,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  check.statusCode == null
                      ? check.status
                      : 'HTTP ${check.statusCode}',
                  style: const TextStyle(
                    fontSize: 17,
                    color: Color(0xFF071631),
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  check.location ?? 'default',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  _formatDateTime(check.checkedAt),
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: soft,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              check.responseTimeMs == null ? '-' : '${check.responseTimeMs}ms',
              style: TextStyle(
                fontSize: 10,
                color: color,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _IncidentsTab extends StatelessWidget {
  const _IncidentsTab();

  @override
  Widget build(BuildContext context) {
    return const _InlineState(
      icon: Icons.check_circle_outline_rounded,
      title: 'No active incidents',
      subtitle: 'Incident data is available in the Incidents tab.',
    );
  }
}

class _HistoryTab extends StatelessWidget {
  const _HistoryTab({required this.monitor});

  final Monitor monitor;

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Monitor Settings',
            style: TextStyle(
              fontSize: 16,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 28),
          _HistoryRow(label: 'Type', value: monitor.type),
          const SizedBox(height: 28),
          _HistoryRow(
            label: 'Expected code',
            value: '${monitor.expectedStatusCode ?? 200}',
          ),
          const SizedBox(height: 28),
          _HistoryRow(
            label: 'Frequency',
            value: '${monitor.frequencySeconds ?? 60}s',
          ),
          const SizedBox(height: 28),
          _HistoryRow(
            label: 'Timeout',
            value: '${monitor.timeoutSeconds ?? 10}s',
          ),
        ],
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  final String label;
  final String value;

  const _HistoryRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF334155),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 15,
            color: Color(0xFF071631),
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _CenteredState extends StatelessWidget {
  const _CenteredState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: _InlineState(
          icon: icon,
          title: title,
          subtitle: subtitle,
          action: action,
        ),
      ),
    );
  }
}

class _InlineState extends StatelessWidget {
  const _InlineState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.action,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? action;

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
          if (action != null) ...[const SizedBox(height: 16), action!],
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

class _ChartPainter extends CustomPainter {
  final _ChartType type;

  _ChartPainter(this.type);

  @override
  void paint(Canvas canvas, Size size) {
    final labelStyle = const TextStyle(
      color: Color(0xFF94A3B8),
      fontSize: 10,
      fontWeight: FontWeight.w600,
    );

    final paint = Paint()
      ..color = type == _ChartType.uptime
          ? const Color(0xFF2F73FF)
          : const Color(0xFF8B5CF6)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const leftPad = 54.0;
    const bottomPad = 24.0;
    const topPad = 4.0;
    final chartWidth = size.width - leftPad - 4;
    final chartHeight = size.height - topPad - bottomPad;
    final labels = type == _ChartType.uptime
        ? ['100%', '99.75%', '99.5%', '99.25%', '99%']
        : ['300ms', '225ms', '150ms', '75ms'];

    for (int i = 0; i < labels.length; i++) {
      final y = topPad + chartHeight * i / (labels.length - 1);
      _drawText(canvas, labels[i], Offset(0, y - 7), labelStyle);
    }

    final points = List.generate(90, (i) {
      final t = i / 89;
      final spike = 0.35 * math.exp(-math.pow((t - 0.34) / 0.06, 2));
      final wave = 0.05 * math.sin(t * math.pi * 4);
      return Offset(
        leftPad + chartWidth * t,
        topPad + chartHeight * (0.22 + wave + spike),
      );
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

    canvas.drawPath(path, paint);
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

String _formatDateTime(DateTime? value) {
  if (value == null) return '-';

  String two(int number) => number.toString().padLeft(2, '0');
  return '${value.year}-${two(value.month)}-${two(value.day)} '
      '${two(value.hour)}:${two(value.minute)}:${two(value.second)}';
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Unexpected error while contacting the API.';
}
