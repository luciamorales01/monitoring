import 'package:flutter/material.dart';

class SectionDetailScreen extends StatelessWidget {
  final String sectionName;

  const SectionDetailScreen({super.key, required this.sectionName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _TopBar(sectionName: sectionName),
              const SizedBox(height: 22),
              _Header(sectionName: sectionName),
              const SizedBox(height: 22),
              const _SummaryCards(),
              const SizedBox(height: 22),
              const _MembersSection(),
              const SizedBox(height: 22),
              const _MonitorsSection(),
              const SizedBox(height: 90),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final String sectionName;

  const _TopBar({required this.sectionName});

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
            'Sections',
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

class _Header extends StatelessWidget {
  final String sectionName;

  const _Header({required this.sectionName});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB).withOpacity(0.12),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.window_outlined,
            color: Color(0xFF2563EB),
            size: 28,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                sectionName,
                style: const TextStyle(
                  fontSize: 28,
                  height: 1,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF071631),
                  letterSpacing: -0.6,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Monitors and members assigned to this section',
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
          decoration: BoxDecoration(
            color: const Color(0xFFEAFBF1),
            borderRadius: BorderRadius.circular(999),
          ),
          child: const Text(
            'Operational',
            style: TextStyle(
              fontSize: 10,
              color: Color(0xFF16A34A),
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    );
  }
}

class _SummaryCards extends StatelessWidget {
  const _SummaryCards();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: const [
        Expanded(
          child: _MetricCard(
            title: 'Monitors',
            value: '5',
            subtitle: '4 up · 1 down',
            color: Color(0xFF2563EB),
            icon: Icons.monitor_heart_outlined,
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: _MetricCard(
            title: 'Members',
            value: '3',
            subtitle: 'Assigned team',
            color: Color(0xFF8B5CF6),
            icon: Icons.group_outlined,
          ),
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final Color color;
  final IconData icon;

  const _MetricCard({
    required this.title,
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
          _IconBox(icon: icon, color: color),
          const SizedBox(height: 16),
          Text(
            value,
            style: const TextStyle(
              fontSize: 25,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            title,
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

class _MembersSection extends StatelessWidget {
  const _MembersSection();

  @override
  Widget build(BuildContext context) {
    return _Card(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 8),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionTitle(title: 'Members', action: 'Manage'),
          SizedBox(height: 14),
          _MemberRow(
            initials: 'JD',
            name: 'John Doe',
            role: 'Section owner',
            color1: Color(0xFF6366F1),
            color2: Color(0xFFA855F7),
          ),
          _MemberRow(
            initials: 'AM',
            name: 'Ana Martín',
            role: 'Incident manager',
            color1: Color(0xFF22C55E),
            color2: Color(0xFF16A34A),
          ),
          _MemberRow(
            initials: 'CR',
            name: 'Carlos Ruiz',
            role: 'Observer',
            color1: Color(0xFFFF7A1A),
            color2: Color(0xFFFFB020),
            showDivider: false,
          ),
        ],
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  final String initials;
  final String name;
  final String role;
  final Color color1;
  final Color color2;
  final bool showDivider;

  const _MemberRow({
    required this.initials,
    required this.name,
    required this.role,
    required this.color1,
    required this.color2,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [color1, color2],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Text(
                initials,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF071631),
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    role,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
          ],
        ),
        if (showDivider)
          const Padding(
            padding: EdgeInsets.only(left: 55, top: 13, bottom: 13),
            child: Divider(height: 1, color: Color(0xFFE7EAF0)),
          ),
        if (!showDivider) const SizedBox(height: 10),
      ],
    );
  }
}

class _MonitorsSection extends StatelessWidget {
  const _MonitorsSection();

  @override
  Widget build(BuildContext context) {
    final monitors = [
      const _MonitorData(
        title: 'Production API',
        url: 'https://api.example.com',
        status: 'Operational',
        uptime: '99.98%',
        response: '142ms',
        color: Color(0xFF22C55E),
        icon: Icons.check_circle_outline_rounded,
      ),
      const _MonitorData(
        title: 'Payment Gateway',
        url: 'https://payments.example.com',
        status: 'Operational',
        uptime: '100%',
        response: '89ms',
        color: Color(0xFF22C55E),
        icon: Icons.check_circle_outline_rounded,
      ),
      const _MonitorData(
        title: 'Auth Service',
        url: 'https://auth.example.com',
        status: 'Down',
        uptime: '97.82%',
        response: '—',
        color: Color(0xFFFF4D4F),
        icon: Icons.cancel_outlined,
      ),
      const _MonitorData(
        title: 'CDN Edge Nodes',
        url: 'https://cdn.example.com',
        status: 'Degraded',
        uptime: '99.45%',
        response: '312ms',
        color: Color(0xFFFF7A1A),
        icon: Icons.warning_amber_rounded,
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(title: 'Monitors', action: 'View all'),
        const SizedBox(height: 14),
        ...monitors.map(
          (monitor) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: _MonitorCard(monitor: monitor),
          ),
        ),
      ],
    );
  }
}

class _MonitorCard extends StatelessWidget {
  final _MonitorData monitor;

  const _MonitorCard({required this.monitor});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: () => Navigator.pushNamed(context, '/monitor-detail'),
      child: _Card(
        padding: const EdgeInsets.fromLTRB(18, 17, 18, 17),
        child: Column(
          children: [
            Row(
              children: [
                _IconBox(icon: monitor.icon, color: monitor.color),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        monitor.title,
                        style: const TextStyle(
                          fontSize: 17,
                          color: Color(0xFF071631),
                          fontWeight: FontWeight.w900,
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
                _StatusBadge(text: monitor.status, color: monitor.color),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                _MonitorMetric(label: 'Uptime', value: monitor.uptime),
                _MonitorMetric(label: 'Response', value: monitor.response),
                const _MonitorMetric(label: 'Last Check', value: '30s ago'),
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
    return Expanded(
      child: Column(
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
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String action;

  const _SectionTitle({required this.title, required this.action});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              color: Color(0xFF071631),
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        Text(
          action,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF2563EB),
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String text;
  final Color color;

  const _StatusBadge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
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

  const _IconBox({required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 39,
      height: 39,
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Icon(icon, color: color, size: 22),
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

class _MonitorData {
  final String title;
  final String url;
  final String status;
  final String uptime;
  final String response;
  final Color color;
  final IconData icon;

  const _MonitorData({
    required this.title,
    required this.url,
    required this.status,
    required this.uptime,
    required this.response,
    required this.color,
    required this.icon,
  });
}
