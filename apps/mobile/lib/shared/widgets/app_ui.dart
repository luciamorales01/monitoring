import 'package:flutter/material.dart';

import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_shadows.dart';
import '../../styles/app_spacing.dart';
import '../../styles/app_text_styles.dart';

enum AppDestination { dashboard, monitors, incidents, sections }

enum AppStatusTone { primary, success, danger, warning, neutral, paused }

class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.body,
    this.currentDestination,
    this.padding,
    this.scrollable = false,
    this.safeAreaBottom = false,
    this.backgroundColor,
    this.floatingActionButton,
  });

  final Widget body;
  final AppDestination? currentDestination;
  final EdgeInsetsGeometry? padding;
  final bool scrollable;
  final bool safeAreaBottom;
  final Color? backgroundColor;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    Widget content = body;

    if (padding != null) {
      content = Padding(padding: padding!, child: content);
    }

    if (scrollable) {
      content = SingleChildScrollView(child: content);
    }

    content = SafeArea(bottom: safeAreaBottom, child: content);

    return Scaffold(
      backgroundColor: backgroundColor ?? AppColors.background,
      body: content,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: currentDestination == null
          ? null
          : _AppBottomNavigation(currentDestination: currentDestination!),
    );
  }
}

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.onTap,
    this.color,
    this.borderColor,
    this.borderRadius,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  final Color? borderColor;
  final double? borderRadius;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? AppRadius.lg;
    final content = Container(
      decoration: BoxDecoration(
        color: color ?? AppColors.surface,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor ?? AppColors.border),
        boxShadow: AppShadows.soft,
      ),
      child: Padding(padding: padding, child: child),
    );

    if (onTap == null) {
      return content;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: content,
      ),
    );
  }
}

class MetricCard extends StatelessWidget {
  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.subtitle,
    required this.icon,
    this.tone = AppStatusTone.primary,
  });

  final String label;
  final String value;
  final String subtitle;
  final IconData icon;
  final AppStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final palette = _tonePalette(tone);

    return AppCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: palette.soft,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Icon(icon, color: palette.color, size: 22),
          ),
          const Spacer(),
          Text(label, style: AppTextStyles.caption),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.metric,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            subtitle,
            style: AppTextStyles.caption.copyWith(color: palette.color),
          ),
        ],
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.tone = AppStatusTone.neutral,
    this.icon,
    this.showDot = true,
  });

  final String label;
  final AppStatusTone tone;
  final IconData? icon;
  final bool showDot;

  @override
  Widget build(BuildContext context) {
    final palette = _tonePalette(tone);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: palette.soft,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: palette.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: palette.color),
            const SizedBox(width: 6),
          ] else if (showDot) ...[
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: palette.color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: AppTextStyles.label.copyWith(
              color: palette.color,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTextStyles.sectionTitle),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle!, style: AppTextStyles.caption),
              ],
            ],
          ),
        ),
        if (actionLabel != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              padding: EdgeInsets.zero,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              actionLabel!,
              style: AppTextStyles.label.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
      ],
    );
  }
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final button = icon == null
        ? ElevatedButton(onPressed: onPressed, child: Text(label))
        : ElevatedButton.icon(
            onPressed: onPressed,
            icon: Icon(icon, size: 18),
            label: Text(label),
          );

    if (!expand) {
      return button;
    }

    return SizedBox(width: double.infinity, child: button);
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: BorderRadius.circular(AppRadius.lg),
            ),
            child: Icon(icon, color: AppColors.primary, size: 26),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(title, style: AppTextStyles.cardTitle),
          const SizedBox(height: AppSpacing.xs),
          Text(
            message,
            textAlign: TextAlign.center,
            style: AppTextStyles.body.copyWith(color: AppColors.textMuted),
          ),
          if (action != null) ...[
            const SizedBox(height: AppSpacing.lg),
            action!,
          ],
        ],
      ),
    );
  }
}

class MonitorCardData {
  const MonitorCardData({
    required this.id,
    required this.name,
    required this.url,
    required this.statusLabel,
    required this.statusTone,
    required this.uptime,
    required this.responseTime,
    required this.lastCheck,
    this.helper,
  });

  final int id;
  final String name;
  final String url;
  final String statusLabel;
  final AppStatusTone statusTone;
  final String uptime;
  final String responseTime;
  final String lastCheck;
  final String? helper;
}

class MonitorCard extends StatelessWidget {
  const MonitorCard({
    super.key,
    required this.data,
    this.onTap,
    this.actionLabel,
    this.onAction,
  });

  final MonitorCardData data;
  final VoidCallback? onTap;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(18),
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
                      data.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.cardTitle,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      data.url,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTextStyles.caption,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              StatusBadge(label: data.statusLabel, tone: data.statusTone),
            ],
          ),
          if (data.helper != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              data.helper!,
              style: AppTextStyles.caption.copyWith(color: AppColors.textSoft),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _MetricLine(label: 'Uptime', value: data.uptime),
              ),
              Expanded(
                child: _MetricLine(
                  label: 'Respuesta',
                  value: data.responseTime,
                ),
              ),
              Expanded(
                child: _MetricLine(
                  label: 'Ultimo check',
                  value: data.lastCheck,
                ),
              ),
            ],
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: AppSpacing.md),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.chevron_right_rounded, size: 16),
                label: Text(actionLabel!),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class IncidentCardData {
  const IncidentCardData({
    required this.id,
    required this.title,
    required this.monitorName,
    required this.dateLabel,
    required this.priorityLabel,
    required this.priorityTone,
    required this.statusLabel,
    required this.statusTone,
  });

  final int id;
  final String title;
  final String monitorName;
  final String dateLabel;
  final String priorityLabel;
  final AppStatusTone priorityTone;
  final String statusLabel;
  final AppStatusTone statusTone;
}

class IncidentCard extends StatelessWidget {
  const IncidentCard({super.key, required this.data, this.onTap});

  final IncidentCardData data;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(18),
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
                    Text(data.title, style: AppTextStyles.cardTitle),
                    const SizedBox(height: 6),
                    Text(data.monitorName, style: AppTextStyles.caption),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              StatusBadge(label: data.statusLabel, tone: data.statusTone),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.xs,
            runSpacing: AppSpacing.xs,
            children: [
              StatusBadge(
                label: data.priorityLabel,
                tone: data.priorityTone,
                showDot: false,
                icon: Icons.flag_rounded,
              ),
              StatusBadge(
                label: data.dateLabel,
                tone: AppStatusTone.neutral,
                showDot: false,
                icon: Icons.schedule_rounded,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class AppPageHeader extends StatelessWidget {
  const AppPageHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.eyebrow,
  });

  final String title;
  final String subtitle;
  final Widget? trailing;
  final String? eyebrow;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (eyebrow != null) ...[
                Text(eyebrow!, style: AppTextStyles.eyebrow),
                const SizedBox(height: AppSpacing.xs),
              ],
              Text(title, style: AppTextStyles.display),
              const SizedBox(height: AppSpacing.xs),
              Text(subtitle, style: AppTextStyles.subtitle),
            ],
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: AppSpacing.md),
          trailing!,
        ],
      ],
    );
  }
}

class AppAvatarButton extends StatelessWidget {
  const AppAvatarButton({super.key, required this.label, this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          boxShadow: AppShadows.soft,
        ),
        child: Text(
          label,
          style: AppTextStyles.label.copyWith(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _MetricLine extends StatelessWidget {
  const _MetricLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.caption),
        const SizedBox(height: 6),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTextStyles.bodyStrong,
        ),
      ],
    );
  }
}

class _AppBottomNavigation extends StatelessWidget {
  const _AppBottomNavigation({required this.currentDestination});

  final AppDestination currentDestination;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.border)),
        boxShadow: AppShadows.soft,
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 74,
          child: Row(
            children: AppDestination.values.map((destination) {
              final selected = destination == currentDestination;
              return Expanded(
                child: InkWell(
                  onTap: () => _navigate(context, destination),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _destinationIcon(destination),
                        color: selected
                            ? AppColors.primary
                            : AppColors.textMuted,
                        size: 24,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _destinationLabel(destination),
                        style: AppTextStyles.label.copyWith(
                          color: selected
                              ? AppColors.primary
                              : AppColors.textMuted,
                          fontWeight: selected
                              ? FontWeight.w800
                              : FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  void _navigate(BuildContext context, AppDestination destination) {
    final route = _destinationRoute(destination);
    final currentRoute = ModalRoute.of(context)?.settings.name;
    if (route == currentRoute) return;
    Navigator.pushReplacementNamed(context, route);
  }
}

_TonePalette _tonePalette(AppStatusTone tone) {
  switch (tone) {
    case AppStatusTone.success:
      return const _TonePalette(
        color: AppColors.success,
        soft: AppColors.successSoft,
        border: Color(0xFFD6F5E0),
      );
    case AppStatusTone.danger:
      return const _TonePalette(
        color: AppColors.danger,
        soft: AppColors.dangerSoft,
        border: Color(0xFFF9D4D4),
      );
    case AppStatusTone.warning:
      return const _TonePalette(
        color: AppColors.warning,
        soft: AppColors.warningSoft,
        border: Color(0xFFF8DFC0),
      );
    case AppStatusTone.paused:
      return const _TonePalette(
        color: AppColors.paused,
        soft: AppColors.pausedSoft,
        border: AppColors.border,
      );
    case AppStatusTone.primary:
      return const _TonePalette(
        color: AppColors.primary,
        soft: AppColors.primarySoft,
        border: Color(0xFFD7E7FF),
      );
    case AppStatusTone.neutral:
      return const _TonePalette(
        color: AppColors.textMuted,
        soft: AppColors.surfaceSoft,
        border: AppColors.border,
      );
  }
}

IconData _destinationIcon(AppDestination destination) {
  switch (destination) {
    case AppDestination.dashboard:
      return Icons.dashboard_rounded;
    case AppDestination.monitors:
      return Icons.monitor_heart_rounded;
    case AppDestination.incidents:
      return Icons.warning_amber_rounded;
    case AppDestination.sections:
      return Icons.grid_view_rounded;
  }
}

String _destinationLabel(AppDestination destination) {
  switch (destination) {
    case AppDestination.dashboard:
      return 'Dashboard';
    case AppDestination.monitors:
      return 'Monitores';
    case AppDestination.incidents:
      return 'Incidencias';
    case AppDestination.sections:
      return 'Secciones';
  }
}

String _destinationRoute(AppDestination destination) {
  switch (destination) {
    case AppDestination.dashboard:
      return '/dashboard';
    case AppDestination.monitors:
      return '/monitors';
    case AppDestination.incidents:
      return '/incidents';
    case AppDestination.sections:
      return '/sections';
  }
}

class _TonePalette {
  const _TonePalette({
    required this.color,
    required this.soft,
    required this.border,
  });

  final Color color;
  final Color soft;
  final Color border;
}
