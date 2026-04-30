import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import 'data/incident_api.dart';

class IncidentDetailScreen extends StatefulWidget {
  const IncidentDetailScreen({super.key});

  @override
  State<IncidentDetailScreen> createState() => _IncidentDetailScreenState();
}

class _IncidentDetailScreenState extends State<IncidentDetailScreen> {
  final _incidentApi = IncidentApi();
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
    final future = _incidentFuture;

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        bottom: false,
        child: future == null
            ? const _CenteredState(
                icon: Icons.link_off_rounded,
                title: 'Incident not selected',
                subtitle: 'Open an incident from the incidents list.',
              )
            : FutureBuilder<Incident>(
                future: future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const _CenteredState(
                      icon: Icons.sync_rounded,
                      title: 'Loading incident',
                      subtitle: 'Fetching incident details from the API.',
                    );
                  }

                  if (snapshot.hasError) {
                    return _CenteredState(
                      icon: Icons.error_outline_rounded,
                      title: 'Could not load incident',
                      subtitle: _errorMessage(snapshot.error),
                      action: ElevatedButton.icon(
                        onPressed: _retry,
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Retry'),
                      ),
                    );
                  }

                  final incident = snapshot.data!;

                  return SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(22, 18, 22, 28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _TopBar(),
                        const SizedBox(height: 22),
                        _IncidentHeader(incident: incident),
                        const SizedBox(height: 22),
                        _SummaryCards(incident: incident),
                        const SizedBox(height: 22),
                        _AffectedMonitorCard(incident: incident),
                        const SizedBox(height: 22),
                        _TimelineCard(incident: incident),
                        const SizedBox(height: 22),
                        _TechnicalDataCard(incident: incident),
                        const SizedBox(height: 22),
                        _NotesCard(incident: incident),
                        const SizedBox(height: 90),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar();

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => Navigator.pop(context),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.arrow_back_rounded, size: 18, color: Color(0xFF2563EB)),
          SizedBox(width: 6),
          Text(
            'Incidents',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF2563EB),
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _IncidentHeader extends StatelessWidget {
  const _IncidentHeader({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final status = _statusData(incident);

    return _Card(
      padding: const EdgeInsets.all(20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _IconBox(
            icon: incident.isResolved
                ? Icons.schedule_rounded
                : Icons.error_outline_rounded,
            color: status.color,
            background: status.background,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  incident.title.isEmpty ? 'Incident' : incident.title,
                  style: const TextStyle(
                    fontSize: 24,
                    height: 1.1,
                    color: Color(0xFF071631),
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  incident.monitor?.target ?? 'No monitor target',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _Badge(
                      text: status.label,
                      color: status.color,
                      background: status.background,
                    ),
                    _Badge(
                      text: incident.isResolved ? 'Resolved' : 'Critical',
                      color: status.color,
                      background: status.background,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCards extends StatelessWidget {
  const _SummaryCards({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final status = _statusData(incident);

    return Row(
      children: [
        Expanded(
          child: _MetricCard(
            label: 'Started',
            value: _timeOnly(incident.startedAt),
            subtitle: _dateOnly(incident.startedAt),
            color: status.color,
            icon: Icons.access_time_rounded,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            label: 'Duration',
            value: _durationLabel(incident),
            subtitle: incident.isResolved ? 'Resolved' : 'Still active',
            color: const Color(0xFFFF7A1A),
            icon: Icons.timer_outlined,
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String subtitle;
  final Color color;
  final IconData icon;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.subtitle,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _IconBox(
            icon: icon,
            color: color,
            background: color.withOpacity(0.12),
          ),
          const SizedBox(height: 16),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 25,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w800,
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

    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: monitor == null
          ? null
          : () => Navigator.pushNamed(
              context,
              '/monitor-detail',
              arguments: monitor.id,
            ),
      child: _Card(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            _IconBox(
              icon: Icons.monitor_heart_outlined,
              color: const Color(0xFFFF4D4F),
              background: const Color(0xFFFFECEF),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Affected monitor',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    monitor?.name ?? 'Unknown monitor',
                    style: const TextStyle(
                      fontSize: 17,
                      color: Color(0xFF071631),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    monitor == null
                        ? 'Monitor data unavailable'
                        : 'Current status ${monitor.currentStatus}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFFFF4D4F),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(title: 'Timeline'),
          const SizedBox(height: 16),
          _TimelineRow(
            icon: Icons.error_outline_rounded,
            color: const Color(0xFFFF4D4F),
            title: 'Incident opened',
            subtitle: incident.title.isEmpty
                ? 'Monitor reported failure'
                : incident.title,
            time: _timeOnly(incident.startedAt),
          ),
          if (incident.resolvedAt != null)
            _TimelineRow(
              icon: Icons.check_circle_outline_rounded,
              color: const Color(0xFF22C55E),
              title: 'Incident resolved',
              subtitle: 'Monitor returned to a healthy state',
              time: _timeOnly(incident.resolvedAt),
              showDivider: false,
            )
          else
            const _TimelineRow(
              icon: Icons.search_rounded,
              color: Color(0xFFFF7A1A),
              title: 'Investigation active',
              subtitle: 'Incident is still open',
              time: 'Now',
              showDivider: false,
            ),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String time;
  final bool showDivider;

  const _TimelineRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.time,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _IconBox(
              icon: icon,
              color: color,
              background: color.withOpacity(0.12),
              size: 38,
              iconSize: 21,
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF071631),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              time,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        if (showDivider)
          const Padding(
            padding: EdgeInsets.only(left: 51, top: 14, bottom: 14),
            child: Divider(height: 1, color: Color(0xFFE7EAF0)),
          ),
        if (!showDivider) const SizedBox(height: 10),
      ],
    );
  }
}

class _TechnicalDataCard extends StatelessWidget {
  const _TechnicalDataCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final monitor = incident.monitor;

    return _Card(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(title: 'Technical data'),
          const SizedBox(height: 16),
          _InfoRow(label: 'Monitor', value: monitor?.name ?? '-'),
          _InfoRow(label: 'Target', value: monitor?.target ?? '-'),
          _InfoRow(
            label: 'Expected code',
            value: '${monitor?.expectedStatusCode ?? 200}',
          ),
          _InfoRow(
            label: 'Response time',
            value: monitor?.lastResponseTime == null
                ? '-'
                : '${monitor!.lastResponseTime}ms',
          ),
          _InfoRow(
            label: 'Check interval',
            value: '${monitor?.frequencySeconds ?? 60} seconds',
          ),
          _InfoRow(
            label: 'Incident ID',
            value: 'INC-${incident.id}',
            showDivider: false,
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool showDivider;

  const _InfoRow({
    required this.label,
    required this.value,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Flexible(
              child: Text(
                value,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFF071631),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
        if (showDivider)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 13),
            child: Divider(height: 1, color: Color(0xFFE7EAF0)),
          ),
        if (!showDivider) const SizedBox(height: 10),
      ],
    );
  }
}

class _NotesCard extends StatelessWidget {
  const _NotesCard({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final note = incident.isResolved
        ? 'Incident resolved at ${_formatDateTime(incident.resolvedAt)}.'
        : 'Incident is open. Review backend logs and monitor checks.';

    return _Card(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(title: 'Notes'),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE7EAF0)),
            ),
            child: Text(
              note,
              style: const TextStyle(
                fontSize: 13,
                height: 1.45,
                color: Color(0xFF334155),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
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
        child: _Card(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
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
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        color: Color(0xFF071631),
        fontWeight: FontWeight.w900,
      ),
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _IconBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color background;
  final double size;
  final double iconSize;

  const _IconBox({
    required this.icon,
    required this.color,
    required this.background,
    this.size = 42,
    this.iconSize = 23,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(size * 0.32),
      ),
      child: Icon(icon, color: color, size: iconSize),
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
    required this.background,
  });

  final String label;
  final Color color;
  final Color background;
}

_StatusData _statusData(Incident incident) {
  if (incident.isResolved) {
    return const _StatusData(
      label: 'Resolved',
      color: Color(0xFF16A34A),
      background: Color(0xFFEAFBF1),
    );
  }

  return const _StatusData(
    label: 'Investigating',
    color: Color(0xFFFF4D4F),
    background: Color(0xFFFFECEF),
  );
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
  if (duration.inHours < 1) return '${duration.inMinutes}m';
  if (duration.inDays < 1) {
    return '${duration.inHours}h ${duration.inMinutes % 60}m';
  }
  return '${duration.inDays}d ${duration.inHours % 24}h';
}

String _dateOnly(DateTime? value) {
  if (value == null) return '-';
  String two(int number) => number.toString().padLeft(2, '0');
  return '${value.year}-${two(value.month)}-${two(value.day)}';
}

String _timeOnly(DateTime? value) {
  if (value == null) return '-';
  String two(int number) => number.toString().padLeft(2, '0');
  return '${two(value.hour)}:${two(value.minute)}';
}

String _formatDateTime(DateTime? value) {
  if (value == null) return '-';
  return '${_dateOnly(value)} ${_timeOnly(value)}';
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Unexpected error while contacting the API.';
}
