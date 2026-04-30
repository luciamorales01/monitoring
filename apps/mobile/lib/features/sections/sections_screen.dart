import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../organizations/data/organization_api.dart';
import 'section_detail_screen.dart';

class SectionsScreen extends StatefulWidget {
  const SectionsScreen({super.key});

  @override
  State<SectionsScreen> createState() => _SectionsScreenState();
}

class _SectionsScreenState extends State<SectionsScreen> {
  final _organizationApi = OrganizationApi();
  late Future<List<Organization>> _organizationsFuture;
  final int _currentIndex = 3;

  @override
  void initState() {
    super.initState();
    _organizationsFuture = _organizationApi.getOrganizations();
  }

  void _retry() {
    setState(() => _organizationsFuture = _organizationApi.getOrganizations());
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

  void _openSectionDetail(_SectionData section) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SectionDetailScreen(sectionName: section.name),
      ),
    );
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _Header(),
              const SizedBox(height: 22),
              FutureBuilder<List<Organization>>(
                future: _organizationsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const _InfoState(
                      icon: Icons.sync_rounded,
                      title: 'Loading organizations',
                      subtitle: 'Fetching organizations from the API.',
                    );
                  }

                  if (snapshot.hasError) {
                    return _ErrorState(
                      message: _errorMessage(snapshot.error),
                      onRetry: _retry,
                    );
                  }

                  final sections = (snapshot.data ?? const <Organization>[])
                      .map(_SectionData.fromOrganization)
                      .toList();

                  return _SectionsList(
                    sections: sections,
                    onSectionTap: _openSectionDetail,
                  );
                },
              ),
            ],
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
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Sections',
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
          'Monitor groups by service category',
          style: TextStyle(
            fontSize: 13,
            color: Color(0xFF7A8494),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _SectionsList extends StatelessWidget {
  final List<_SectionData> sections;
  final ValueChanged<_SectionData> onSectionTap;

  const _SectionsList({required this.sections, required this.onSectionTap});

  @override
  Widget build(BuildContext context) {
    if (sections.isEmpty) {
      return const _InfoState(
        icon: Icons.business_rounded,
        title: 'No organizations',
        subtitle: 'Organizations returned by the API will appear here.',
      );
    }

    return Column(
      children: sections
          .map(
            (section) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: _SectionCard(section: section, onTap: onSectionTap),
            ),
          )
          .toList(),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final _SectionData section;
  final ValueChanged<_SectionData> onTap;

  const _SectionCard({required this.section, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isPaused = section.statusColor == const Color(0xFF94A3B8);
    final isHealthy = section.statusColor == const Color(0xFF22C55E);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () => onTap(section),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
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
            children: [
              _IconBox(
                icon: section.icon,
                color: section.iconColor,
                size: 46,
                iconSize: 24,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      section.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        height: 1.1,
                        color: Color(0xFF071631),
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${section.monitorCount} monitors',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 14),
                    if (!isPaused) ...[
                      _MiniStatusLine(
                        icon: Icons.check_circle_outline_rounded,
                        label: isHealthy
                            ? '${section.monitorCount} up'
                            : '${section.monitorCount - 1} up',
                        color: const Color(0xFF22C55E),
                        progress: isHealthy ? 1 : 0.78,
                      ),
                      if (!isHealthy) ...[
                        const SizedBox(height: 7),
                        const _MiniStatusLine(
                          icon: Icons.error_outline_rounded,
                          label: '1 down',
                          color: Color(0xFFFF4D4F),
                          progress: 0.18,
                        ),
                      ],
                    ] else
                      const Text(
                        'All monitors paused',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    const SizedBox(height: 12),
                    Text(
                      section.status,
                      style: TextStyle(
                        color: section.statusColor,
                        fontSize: 12,
                        height: 1.25,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: section.statusColor,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniStatusLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final double progress;

  const _MiniStatusLine({
    required this.icon,
    required this.label,
    required this.color,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 6),
        SizedBox(
          width: 48,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF334155),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 5,
              value: progress,
              backgroundColor: const Color(0xFFE5E7EB),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ),
      ],
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

class _IconBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  final double iconSize;

  const _IconBox({
    required this.icon,
    required this.color,
    this.size = 48,
    this.iconSize = 26,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(size * 0.24),
      ),
      child: Icon(icon, color: color, size: iconSize),
    );
  }
}

class _SectionData {
  final String name;
  final int monitorCount;
  final String status;
  final Color statusColor;
  final IconData icon;
  final Color iconColor;

  const _SectionData({
    required this.name,
    required this.monitorCount,
    required this.status,
    required this.statusColor,
    required this.icon,
    required this.iconColor,
  });

  factory _SectionData.fromOrganization(Organization organization) {
    return _SectionData(
      name: organization.name.isEmpty ? organization.slug : organization.name,
      monitorCount: organization.monitorCount ?? 0,
      status: 'Organization synced',
      statusColor: const Color(0xFF22C55E),
      icon: Icons.business_rounded,
      iconColor: const Color(0xFF22C55E),
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
            'Could not load organizations',
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

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Unexpected error while contacting the API.';
}
