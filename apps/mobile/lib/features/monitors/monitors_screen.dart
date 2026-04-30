import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import 'data/monitor_api.dart';

class MonitorsScreen extends StatefulWidget {
  const MonitorsScreen({super.key});

  @override
  State<MonitorsScreen> createState() => _MonitorsScreenState();
}

class _MonitorsScreenState extends State<MonitorsScreen> {
  final _monitorApi = MonitorApi();
  late Future<List<Monitor>> _monitorsFuture;
  final int _currentIndex = 1;
  int _selectedFilter = 0;

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
          padding: const EdgeInsets.fromLTRB(22, 22, 22, 96),
          child: FutureBuilder<List<Monitor>>(
            future: _monitorsFuture,
            builder: (context, snapshot) {
              final monitors = snapshot.data ?? const <Monitor>[];

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Monitors',
                    style: TextStyle(
                      fontSize: 30,
                      height: 1,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF071631),
                      letterSpacing: -0.7,
                    ),
                  ),
                  const SizedBox(height: 22),
                  const _SearchBox(),
                  const SizedBox(height: 16),
                  _FilterChips(
                    monitors: monitors,
                    selectedIndex: _selectedFilter,
                    onChanged: (index) =>
                        setState(() => _selectedFilter = index),
                  ),
                  const SizedBox(height: 22),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const _InfoState(
                      icon: Icons.sync_rounded,
                      title: 'Loading monitors',
                      subtitle: 'Fetching live data from the API.',
                    )
                  else if (snapshot.hasError)
                    _ErrorState(
                      message: _errorMessage(snapshot.error),
                      onRetry: _retry,
                    )
                  else
                    _MonitorList(monitors: _filterMonitors(monitors)),
                ],
              );
            },
          ),
        ),
      ),
    );
  }

  List<Monitor> _filterMonitors(List<Monitor> monitors) {
    return monitors.where((monitor) {
      final state = _monitorState(monitor);
      switch (_selectedFilter) {
        case 1:
          return state == _MonitorState.up;
        case 2:
          return state == _MonitorState.down;
        case 3:
          return state == _MonitorState.paused;
        default:
          return true;
      }
    }).toList();
  }
}

class _SearchBox extends StatelessWidget {
  const _SearchBox();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: const TextField(
        decoration: InputDecoration(
          border: InputBorder.none,
          hintText: 'Search monitors...',
          hintStyle: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          prefixIcon: Icon(
            Icons.search_rounded,
            color: Color(0xFF94A3B8),
            size: 22,
          ),
          contentPadding: EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }
}

class _FilterChips extends StatelessWidget {
  const _FilterChips({
    required this.monitors,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<Monitor> monitors;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final up = monitors.where(
      (item) => _monitorState(item) == _MonitorState.up,
    );
    final down = monitors.where(
      (item) => _monitorState(item) == _MonitorState.down,
    );
    final paused = monitors.where(
      (item) => _monitorState(item) == _MonitorState.paused,
    );
    final filters = [
      'All (${monitors.length})',
      'Up (${up.length})',
      'Down (${down.length})',
      'Paused (${paused.length})',
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(filters.length, (index) {
          final selected = index == selectedIndex;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onChanged(index),
              child: Container(
                height: 39,
                padding: const EdgeInsets.symmetric(horizontal: 17),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected ? const Color(0xFF2563EB) : Colors.white,
                  borderRadius: BorderRadius.circular(13),
                  border: Border.all(
                    color: selected
                        ? const Color(0xFF2563EB)
                        : const Color(0xFFE2E8F0),
                  ),
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF2563EB).withOpacity(0.18),
                            blurRadius: 10,
                            offset: const Offset(0, 5),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  filters[index],
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: selected ? Colors.white : const Color(0xFF334155),
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

class _MonitorList extends StatelessWidget {
  const _MonitorList({required this.monitors});

  final List<Monitor> monitors;

  @override
  Widget build(BuildContext context) {
    if (monitors.isEmpty) {
      return const _InfoState(
        icon: Icons.monitor_heart_outlined,
        title: 'No monitors yet',
        subtitle: 'Create monitors in the backend to see them here.',
      );
    }

    return Column(
      children: monitors
          .map(
            (monitor) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _MonitorCard(monitor: _MonitorData.fromMonitor(monitor)),
            ),
          )
          .toList(),
    );
  }
}

class _MonitorCard extends StatelessWidget {
  final _MonitorData monitor;

  const _MonitorCard({required this.monitor});

  @override
  Widget build(BuildContext context) {
    final style = _stateStyle(monitor.state);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => Navigator.pushNamed(
          context,
          '/monitor-detail',
          arguments: monitor.id,
        ),
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 17, 18, 17),
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
          child: Column(
            children: [
              Row(
                children: [
                  _StatusIcon(style: style, state: monitor.state),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          monitor.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 17,
                            color: Color(0xFF071631),
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          monitor.url,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: style.soft,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      monitor.status,
                      style: TextStyle(
                        fontSize: 10,
                        color: style.color,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: _MonitorMetric(
                      label: 'Uptime',
                      value: monitor.uptime,
                    ),
                  ),
                  Expanded(
                    child: _MonitorMetric(
                      label: 'Response',
                      value: monitor.response,
                    ),
                  ),
                  Expanded(
                    child: _MonitorMetric(
                      label: 'Last Check',
                      value: monitor.lastCheck,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusIcon extends StatelessWidget {
  final _StateStyle style;
  final _MonitorState state;

  const _StatusIcon({required this.style, required this.state});

  @override
  Widget build(BuildContext context) {
    IconData icon;

    switch (state) {
      case _MonitorState.up:
        icon = Icons.check_circle_outline_rounded;
        break;
      case _MonitorState.down:
        icon = Icons.cancel_outlined;
        break;
      case _MonitorState.degraded:
        icon = Icons.warning_amber_rounded;
        break;
      case _MonitorState.paused:
        icon = Icons.pause_rounded;
        break;
    }

    return Container(
      width: 39,
      height: 39,
      decoration: BoxDecoration(
        color: style.soft,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Icon(icon, size: 22, color: style.color),
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
            fontSize: 13,
            color: Color(0xFF071631),
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _InfoState extends StatelessWidget {
  const _InfoState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE7EAF0)),
      ),
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

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFFFECEF)),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFFF4D4F),
            size: 34,
          ),
          const SizedBox(height: 12),
          const Text(
            'Could not load monitors',
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

enum _MonitorState { up, down, degraded, paused }

class _MonitorData {
  final int id;
  final String title;
  final String url;
  final String status;
  final String uptime;
  final String response;
  final String lastCheck;
  final _MonitorState state;

  const _MonitorData({
    required this.id,
    required this.title,
    required this.url,
    required this.status,
    required this.uptime,
    required this.response,
    required this.lastCheck,
    required this.state,
  });

  factory _MonitorData.fromMonitor(Monitor monitor) {
    final state = _monitorState(monitor);

    return _MonitorData(
      id: monitor.id,
      title: monitor.name.isEmpty ? 'Unnamed monitor' : monitor.name,
      url: monitor.target,
      status: _statusLabel(state),
      uptime: state == _MonitorState.down ? '0%' : '-',
      response: monitor.lastResponseTime == null
          ? '-'
          : '${monitor.lastResponseTime}ms',
      lastCheck: _relativeTime(monitor.lastCheckedAt),
      state: state,
    );
  }
}

class _StateStyle {
  final Color color;
  final Color soft;

  const _StateStyle({required this.color, required this.soft});
}

_StateStyle _stateStyle(_MonitorState state) {
  switch (state) {
    case _MonitorState.up:
      return const _StateStyle(
        color: Color(0xFF22C55E),
        soft: Color(0xFFEAFBF1),
      );
    case _MonitorState.down:
      return const _StateStyle(
        color: Color(0xFFFF4D4F),
        soft: Color(0xFFFFECEF),
      );
    case _MonitorState.degraded:
      return const _StateStyle(
        color: Color(0xFFFF7A1A),
        soft: Color(0xFFFFF1E7),
      );
    case _MonitorState.paused:
      return const _StateStyle(
        color: Color(0xFF64748B),
        soft: Color(0xFFF1F5F9),
      );
  }
}

_MonitorState _monitorState(Monitor monitor) {
  if (!monitor.isActive) {
    return _MonitorState.paused;
  }

  switch (monitor.currentStatus.toUpperCase()) {
    case 'UP':
      return _MonitorState.up;
    case 'DOWN':
      return _MonitorState.down;
    case 'UNKNOWN':
    default:
      return _MonitorState.degraded;
  }
}

String _statusLabel(_MonitorState state) {
  switch (state) {
    case _MonitorState.up:
      return 'Operational';
    case _MonitorState.down:
      return 'Down';
    case _MonitorState.degraded:
      return 'Unknown';
    case _MonitorState.paused:
      return 'Paused';
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
