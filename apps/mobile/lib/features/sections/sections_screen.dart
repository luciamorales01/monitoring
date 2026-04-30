import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../shared/widgets/app_ui.dart';
import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';
import '../incidents/data/incident_api.dart';
import '../organizations/data/organization_api.dart';
import 'section_detail_screen.dart';

class SectionsScreen extends StatefulWidget {
  const SectionsScreen({super.key});

  @override
  State<SectionsScreen> createState() => _SectionsScreenState();
}

class _SectionsScreenState extends State<SectionsScreen> {
  final OrganizationApi _organizationApi = OrganizationApi();
  final IncidentApi _incidentApi = IncidentApi();
  late Future<_SectionsPayload> _sectionsFuture;

  @override
  void initState() {
    super.initState();
    _sectionsFuture = _loadSections();
  }

  Future<_SectionsPayload> _loadSections() async {
    final results = await Future.wait<dynamic>([
      _organizationApi.getOrganizations(),
      _incidentApi.getIncidents(),
    ]);

    return _SectionsPayload(
      organizations: results[0] as List<Organization>,
      incidents: results[1] as List<Incident>,
    );
  }

  void _retry() {
    setState(() => _sectionsFuture = _loadSections());
  }

  void _openDetail(_SectionViewData section) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SectionDetailScreen(
          section: SectionDetailData(
            name: section.name,
            monitorCount: section.monitorCount,
            incidentCount: section.incidentCount,
            statusLabel: section.statusLabel,
            statusTone: section.statusTone,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentDestination: AppDestination.sections,
      scrollable: true,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
      body: FutureBuilder<_SectionsPayload>(
        future: _sectionsFuture,
        builder: (context, snapshot) {
          final payload = snapshot.data;
          final sections = payload == null
              ? const <_SectionViewData>[]
              : payload.organizations
                    .map(
                      (organization) => _SectionViewData.fromOrganization(
                        organization,
                        payload.incidents,
                      ),
                    )
                    .toList();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AppPageHeader(
                title: 'Secciones',
                subtitle: 'Agrupacion por workspace con estado consolidado.',
              ),
              const SizedBox(height: AppSpacing.lg),
              if (snapshot.connectionState == ConnectionState.waiting)
                const EmptyState(
                  icon: Icons.sync_rounded,
                  title: 'Cargando secciones',
                  message: 'Recuperando organizaciones e incidencias activas.',
                )
              else if (snapshot.hasError)
                EmptyState(
                  icon: Icons.error_outline_rounded,
                  title: 'No se pudieron cargar las secciones',
                  message: _errorMessage(snapshot.error),
                  action: PrimaryButton(
                    label: 'Reintentar',
                    icon: Icons.refresh_rounded,
                    onPressed: _retry,
                  ),
                )
              else if (sections.isEmpty)
                const EmptyState(
                  icon: Icons.grid_off_rounded,
                  title: 'Sin secciones disponibles',
                  message: 'Las organizaciones del backend apareceran aqui.',
                )
              else
                Column(
                  children: sections.map((section) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.md),
                      child: _SectionCard(
                        section: section,
                        onTap: () => _openDetail(section),
                      ),
                    );
                  }).toList(),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.section, required this.onTap});

  final _SectionViewData section;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: AppColors.primarySoft,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(
                  Icons.grid_view_rounded,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(section.name, style: AppTextStyles.cardTitle),
                    const SizedBox(height: 4),
                    Text(
                      '${section.monitorCount} monitores · ${section.incidentCount} incidencias',
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              StatusBadge(label: section.statusLabel, tone: section.statusTone),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _SectionMetric(
                  label: 'Monitores',
                  value: '${section.monitorCount}',
                ),
              ),
              Expanded(
                child: _SectionMetric(
                  label: 'Incidencias',
                  value: '${section.incidentCount}',
                ),
              ),
              Expanded(
                child: _SectionMetric(
                  label: 'Estado',
                  value: section.shortStatus,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SectionMetric extends StatelessWidget {
  const _SectionMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.caption),
        const SizedBox(height: 6),
        Text(value, style: AppTextStyles.bodyStrong),
      ],
    );
  }
}

class _SectionsPayload {
  const _SectionsPayload({
    required this.organizations,
    required this.incidents,
  });

  final List<Organization> organizations;
  final List<Incident> incidents;
}

class _SectionViewData {
  const _SectionViewData({
    required this.name,
    required this.monitorCount,
    required this.incidentCount,
    required this.statusLabel,
    required this.shortStatus,
    required this.statusTone,
  });

  final String name;
  final int monitorCount;
  final int incidentCount;
  final String statusLabel;
  final String shortStatus;
  final AppStatusTone statusTone;

  factory _SectionViewData.fromOrganization(
    Organization organization,
    List<Incident> incidents,
  ) {
    final activeIncidents = incidents
        .where((incident) => incident.isOpen)
        .length;
    final hasMonitors = (organization.monitorCount ?? 0) > 0;

    if (!hasMonitors) {
      return _SectionViewData(
        name: organization.name.isEmpty ? organization.slug : organization.name,
        monitorCount: organization.monitorCount ?? 0,
        incidentCount: activeIncidents,
        statusLabel: 'Pendiente',
        shortStatus: 'Pendiente',
        statusTone: AppStatusTone.warning,
      );
    }

    if (activeIncidents > 0) {
      return _SectionViewData(
        name: organization.name.isEmpty ? organization.slug : organization.name,
        monitorCount: organization.monitorCount ?? 0,
        incidentCount: activeIncidents,
        statusLabel: 'Problema',
        shortStatus: 'Riesgo',
        statusTone: AppStatusTone.danger,
      );
    }

    return _SectionViewData(
      name: organization.name.isEmpty ? organization.slug : organization.name,
      monitorCount: organization.monitorCount ?? 0,
      incidentCount: activeIncidents,
      statusLabel: 'Online',
      shortStatus: 'Estable',
      statusTone: AppStatusTone.success,
    );
  }
}

String _errorMessage(Object? error) {
  if (error is ApiException) return error.message;
  return 'Error inesperado al consultar la API.';
}
