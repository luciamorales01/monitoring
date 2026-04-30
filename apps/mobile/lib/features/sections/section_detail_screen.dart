import 'package:flutter/material.dart';

import '../../shared/widgets/app_ui.dart';
import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';

class SectionDetailData {
  const SectionDetailData({
    required this.name,
    required this.monitorCount,
    required this.incidentCount,
    required this.statusLabel,
    required this.statusTone,
  });

  final String name;
  final int monitorCount;
  final int incidentCount;
  final String statusLabel;
  final AppStatusTone statusTone;
}

class SectionDetailScreen extends StatelessWidget {
  const SectionDetailScreen({super.key, required this.section});

  final SectionDetailData section;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentDestination: AppDestination.sections,
      scrollable: true,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 104),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextButton.icon(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              foregroundColor: AppColors.primary,
            ),
            icon: const Icon(Icons.arrow_back_rounded, size: 18),
            label: Text(
              'Volver a secciones',
              style: AppTextStyles.label.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _Header(section: section),
          const SizedBox(height: AppSpacing.lg),
          SizedBox(
            height: 168,
            child: Row(
              children: [
                Expanded(
                  child: MetricCard(
                    label: 'Monitores',
                    value: '${section.monitorCount}',
                    subtitle: 'Servicios asociados',
                    icon: Icons.monitor_heart_rounded,
                    tone: AppStatusTone.primary,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: MetricCard(
                    label: 'Incidencias',
                    value: '${section.incidentCount}',
                    subtitle: section.incidentCount == 0
                        ? 'Sin alertas activas'
                        : 'Requiere seguimiento',
                    icon: Icons.warning_amber_rounded,
                    tone: section.incidentCount == 0
                        ? AppStatusTone.success
                        : AppStatusTone.danger,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(
                  title: 'Estado global',
                  subtitle: 'Resumen rapido de operacion',
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: _InsightTile(
                        icon: Icons.grid_view_rounded,
                        title: 'Cobertura',
                        description:
                            '${section.monitorCount} monitores incluidos en esta seccion.',
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: _InsightTile(
                        icon: Icons.shield_outlined,
                        title: 'Salud',
                        description:
                            '${section.statusLabel} como estado operativo general.',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(
                  title: 'Contexto',
                  subtitle: 'Informacion disponible en mobile',
                ),
                const SizedBox(height: AppSpacing.lg),
                _InfoRow(label: 'Seccion', value: section.name),
                _InfoRow(label: 'Estado', value: section.statusLabel),
                _InfoRow(label: 'Monitores', value: '${section.monitorCount}'),
                _InfoRow(
                  label: 'Incidencias activas',
                  value: '${section.incidentCount}',
                  showDivider: false,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.section});

  final SectionDetailData section;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 52,
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
                Text(section.name, style: AppTextStyles.display),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Vista consolidada de monitores e incidencias del grupo.',
                  style: AppTextStyles.subtitle,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          StatusBadge(label: section.statusLabel, tone: section.statusTone),
        ],
      ),
    );
  }
}

class _InsightTile extends StatelessWidget {
  const _InsightTile({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary),
          const SizedBox(height: AppSpacing.md),
          Text(title, style: AppTextStyles.bodyStrong),
          const SizedBox(height: AppSpacing.xs),
          Text(description, style: AppTextStyles.caption),
        ],
      ),
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
            Flexible(
              child: Text(
                value,
                textAlign: TextAlign.end,
                style: AppTextStyles.bodyStrong,
              ),
            ),
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
