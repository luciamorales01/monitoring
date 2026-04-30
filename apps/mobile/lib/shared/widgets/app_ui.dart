import 'package:flutter/material.dart';

import '../../styles/app_colors.dart';
import '../../styles/app_radius.dart';
import '../../styles/app_shadows.dart';
import '../../styles/app_text_styles.dart';

class AppTopBar extends StatelessWidget {
  final Widget? leading;
  final List<Widget>? trailing;

  const AppTopBar({super.key, this.leading, this.trailing});

  @override
  Widget build(BuildContext context) {
    final actions =
        trailing ?? const [_TopBarIcon(icon: Icons.notifications_none_rounded)];

    return Row(
      children: [
        leading ??
            const _TopBarIcon(icon: Icons.grid_view_rounded, filled: true),
        const Spacer(),
        const Icon(
          Icons.monitor_heart_outlined,
          color: AppColors.primary,
          size: 28,
        ),
        const SizedBox(width: 10),
        RichText(
          text: const TextSpan(
            children: [
              TextSpan(
                text: 'Monitoring',
                style: TextStyle(
                  color: AppColors.text,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
              TextSpan(
                text: 'TFG',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
            ],
          ),
        ),
        const Spacer(),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: actions
              .map(
                (widget) => Padding(
                  padding: const EdgeInsets.only(left: 10),
                  child: widget,
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

class AppPageHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? eyebrow;
  final Widget? action;
  final bool compactAction;

  const AppPageHeader({
    super.key,
    required this.title,
    required this.subtitle,
    this.eyebrow,
    this.action,
    this.compactAction = false,
  });

  @override
  Widget build(BuildContext context) {
    final textColumn = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (eyebrow != null) ...[
          Text(eyebrow!.toUpperCase(), style: AppTextStyles.eyebrow),
          const SizedBox(height: 10),
        ],
        Text(title, style: AppTextStyles.title),
        const SizedBox(height: 10),
        Text(subtitle, style: AppTextStyles.subtitle),
      ],
    );

    if (action == null) {
      return textColumn;
    }

    if (compactAction) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: textColumn),
          const SizedBox(width: 16),
          action!,
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [textColumn, const SizedBox(height: 22), action!],
    );
  }
}

class AppSurfaceCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final Border? border;
  final List<BoxShadow>? shadow;

  const AppSurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.color,
    this.border,
    this.shadow,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color ?? AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: border ?? Border.all(color: AppColors.border.withOpacity(0.7)),
        boxShadow: shadow ?? AppShadows.soft,
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}

class AppIconTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;
  final double iconSize;

  const AppIconTile({
    super.key,
    required this.icon,
    required this.color,
    this.size = 48,
    this.iconSize = 24,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.16), color.withOpacity(0.08)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        border: Border.all(color: color.withOpacity(0.10)),
      ),
      child: Icon(icon, color: color, size: iconSize),
    );
  }
}

class AppBadge extends StatelessWidget {
  final String text;
  final Color color;
  final IconData? icon;
  final bool outlined;

  const AppBadge({
    super.key,
    required this.text,
    this.color = AppColors.textMuted,
    this.icon,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: outlined ? AppColors.surface : color.withOpacity(0.10),
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(
          color: outlined ? AppColors.borderStrong : color.withOpacity(0.16),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
          ],
          Text(
            text,
            style: AppTextStyles.label.copyWith(
              color: color,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class AppSectionHeading extends StatelessWidget {
  final String title;
  final String? actionText;

  const AppSectionHeading({super.key, required this.title, this.actionText});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(title, style: AppTextStyles.sectionTitle)),
        if (actionText != null)
          Text(
            actionText!,
            style: AppTextStyles.label.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w800,
            ),
          ),
      ],
    );
  }
}

class AppGhostButton extends StatelessWidget {
  final String text;
  final IconData? icon;
  final VoidCallback? onPressed;

  const AppGhostButton({
    super.key,
    required this.text,
    this.icon,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: icon != null ? Icon(icon, size: 18) : const SizedBox.shrink(),
      label: Text(text),
      style: OutlinedButton.styleFrom(
        iconColor: AppColors.textMuted,
        foregroundColor: AppColors.text,
        side: const BorderSide(color: AppColors.border),
      ),
    );
  }
}

class AppPillControl extends StatelessWidget {
  final String text;
  final IconData? leading;
  final IconData? trailing;

  const AppPillControl({
    super.key,
    required this.text,
    this.leading,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (leading != null) ...[
            Icon(leading, size: 16, color: AppColors.textMuted),
            const SizedBox(width: 8),
          ],
          Text(
            text,
            style: AppTextStyles.label.copyWith(color: AppColors.textSoft),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 6),
            Icon(trailing, size: 16, color: AppColors.textMuted),
          ],
        ],
      ),
    );
  }
}

class _TopBarIcon extends StatelessWidget {
  final IconData icon;
  final bool filled;

  const _TopBarIcon({required this.icon, this.filled = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: filled ? AppColors.surface : AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border.withOpacity(0.8)),
        boxShadow: filled ? AppShadows.soft : null,
      ),
      child: Icon(icon, color: AppColors.textMuted, size: 20),
    );
  }
}
