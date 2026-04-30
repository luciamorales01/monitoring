import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import 'data/incident_api.dart';

class IncidentsScreen extends StatefulWidget {
  const IncidentsScreen({super.key});

  @override
  State<IncidentsScreen> createState() => _IncidentsScreenState();
}

class _IncidentsScreenState extends State<IncidentsScreen> {
  final _incidentApi = IncidentApi();
  late Future<List<Incident>> _incidentsFuture;
  final int _currentIndex = 2;
  int _selectedFilter = 0;

  @override
  void initState() {
    super.initState();
    _incidentsFuture = _incidentApi.getIncidents();
  }

  void _retry() {
    setState(() => _incidentsFuture = _incidentApi.getIncidents());
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
          child: FutureBuilder<List<Incident>>(
            future: _incidentsFuture,
            builder: (context, snapshot) {
              final incidents = snapshot.data ?? const <Incident>[];
              final active = incidents.where((item) => item.isOpen).toList();
              final history = incidents.where((item) => !item.isOpen).toList();
              final visible = _selectedFilter == 0 ? active : history;

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Incidents',
                    style: TextStyle(
                      fontSize: 30,
                      height: 1,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF071631),
                      letterSpacing: -0.7,
                    ),
                  ),
                  const SizedBox(height: 22),
                  _SegmentedTabs(
                    activeCount: active.length,
                    historyCount: history.length,
                    selectedIndex: _selectedFilter,
                    onChanged: (index) =>
                        setState(() => _selectedFilter = index),
                  ),
                  const SizedBox(height: 22),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const _InfoState(
                      icon: Icons.sync_rounded,
                      title: 'Loading incidents',
                      subtitle: 'Fetching incident history from the API.',
                    )
                  else if (snapshot.hasError)
                    _ErrorState(
                      message: _errorMessage(snapshot.error),
                      onRetry: _retry,
                    )
                  else
                    _IncidentList(
                      incidents: visible,
                      emptyTitle: _selectedFilter == 0
                          ? 'No active incidents'
                          : 'No incident history',
                      emptySubtitle: _selectedFilter == 0
                          ? 'All monitors are currently clear.'
                          : 'Resolved incidents will appear here.',
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _SegmentedTabs extends StatelessWidget {
  final int activeCount;
  final int historyCount;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const _SegmentedTabs({
    required this.activeCount,
    required this.historyCount,
    required this.selectedIndex,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _TabButton(
          text: 'Active ($activeCount)',
          selected: selectedIndex == 0,
          activeColor: const Color(0xFFF00612),
          onTap: () => onChanged(0),
        ),
        const SizedBox(width: 8),
        _TabButton(
          text: 'History ($historyCount)',
          selected: selectedIndex == 1,
          activeColor: const Color(0xFF2563EB),
          onTap: () => onChanged(1),
        ),
      ],
    );
  }
}

class _TabButton extends StatelessWidget {
  final String text;
  final bool selected;
  final Color activeColor;
  final VoidCallback onTap;

  const _TabButton({
    required this.text,
    required this.selected,
    required this.activeColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 45,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? activeColor : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? activeColor : const Color(0xFFE2E8F0),
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: activeColor.withOpacity(0.18),
                      blurRadius: 10,
                      offset: const Offset(0, 5),
                    ),
                  ]
                : null,
          ),
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: selected ? Colors.white : const Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    );
  }
}

class _IncidentList extends StatelessWidget {
  const _IncidentList({
    required this.incidents,
    required this.emptyTitle,
    required this.emptySubtitle,
  });

  final List<Incident> incidents;
  final String emptyTitle;
  final String emptySubtitle;

  @override
  Widget build(BuildContext context) {
    if (incidents.isEmpty) {
      return _InfoState(
        icon: Icons.check_circle_outline_rounded,
        title: emptyTitle,
        subtitle: emptySubtitle,
      );
    }

    return Column(
      children: incidents
          .map(
            (incident) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _IncidentCard(data: _IncidentData.fromIncident(incident)),
            ),
          )
          .toList(),
    );
  }
}

class _IncidentCard extends StatelessWidget {
  const _IncidentCard({required this.data});

  final _IncidentData data;

  @override
  Widget build(BuildContext context) {
    final badgeColor = data.resolved ? const Color(0xFF16A34A) : data.color;
    final badgeSoft = data.resolved ? const Color(0xFFEAFBF1) : data.softColor;

    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: () =>
          Navigator.pushNamed(context, '/incident-detail', arguments: data.id),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(17, 17, 17, 18),
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
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _IncidentIcon(
              icon: data.icon,
              color: data.color,
              background: data.softColor,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          data.title,
                          style: const TextStyle(
                            fontSize: 17,
                            height: 1.25,
                            color: Color(0xFF071631),
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _Badge(
                        text: data.status,
                        color: badgeColor,
                        background: badgeSoft,
                      ),
                    ],
                  ),
                  const SizedBox(height: 13),
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time_rounded,
                        size: 15,
                        color: Color(0xFF64748B),
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          'Started ${data.started}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 7),
                  Text(
                    'Duration: ${data.duration}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 13),
                  Wrap(
                    spacing: 7,
                    runSpacing: 7,
                    children: data.tags.map((tag) => _Tag(text: tag)).toList(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IncidentIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color background;

  const _IncidentIcon({
    required this.icon,
    required this.color,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 39,
      height: 39,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Icon(icon, color: color, size: 22),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  final Color background;

  const _Badge({
    required this.text,
    required this.color,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 9.5,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;

  const _Tag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: Color(0xFF334155),
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
        ),
      ),
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
            'Could not load incidents',
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

class _IncidentData {
  const _IncidentData({
    required this.id,
    required this.title,
    required this.status,
    required this.started,
    required this.duration,
    required this.color,
    required this.softColor,
    required this.icon,
    required this.resolved,
    required this.tags,
  });

  final int id;
  final String title;
  final String status;
  final String started;
  final String duration;
  final Color color;
  final Color softColor;
  final IconData icon;
  final bool resolved;
  final List<String> tags;

  factory _IncidentData.fromIncident(Incident incident) {
    final resolved = incident.isResolved;

    return _IncidentData(
      id: incident.id,
      title: incident.title.isEmpty ? 'Incident' : incident.title,
      status: resolved ? 'Resolved' : 'Investigating',
      started: _formatDateTime(incident.startedAt),
      duration: _durationLabel(incident),
      color: resolved ? const Color(0xFFFF7A1A) : const Color(0xFFFF4D4F),
      softColor: resolved ? const Color(0xFFFFF1E7) : const Color(0xFFFFECEF),
      icon: resolved ? Icons.schedule_rounded : Icons.error_outline_rounded,
      resolved: resolved,
      tags: [incident.monitor?.name ?? 'Monitor'],
    );
  }
}

String _durationLabel(Incident incident) {
  if (incident.durationSeconds != null) {
    return _formatDuration(Duration(seconds: incident.durationSeconds!));
  }

  if (incident.startedAt == null) return '-';
  return _formatDuration(DateTime.now().difference(incident.startedAt!));
}

String _formatDuration(Duration duration) {
  if (duration.inMinutes < 1) return '${duration.inSeconds}s';
  if (duration.inHours < 1) return '${duration.inMinutes} minutes';
  if (duration.inDays < 1) {
    return '${duration.inHours}h ${duration.inMinutes % 60}m';
  }
  return '${duration.inDays}d ${duration.inHours % 24}h';
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
