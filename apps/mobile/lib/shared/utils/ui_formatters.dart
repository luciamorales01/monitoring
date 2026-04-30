class UiFormatters {
  static String relativeTime(DateTime? value) {
    if (value == null) return 'Nunca';

    final diff = DateTime.now().difference(value);
    if (diff.inSeconds < 60) return 'Hace ${diff.inSeconds}s';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours} h';
    return 'Hace ${diff.inDays} d';
  }

  static String date(DateTime? value) {
    if (value == null) return '-';
    return '${value.year}-${_two(value.month)}-${_two(value.day)}';
  }

  static String time(DateTime? value) {
    if (value == null) return '-';
    return '${_two(value.hour)}:${_two(value.minute)}';
  }

  static String dateTime(DateTime? value) {
    if (value == null) return '-';
    return '${date(value)} ${time(value)}';
  }

  static String durationFromSeconds(int? seconds) {
    if (seconds == null) return '-';
    return duration(Duration(seconds: seconds));
  }

  static String duration(Duration duration) {
    if (duration.inMinutes < 1) return '${duration.inSeconds}s';
    if (duration.inHours < 1) return '${duration.inMinutes} min';
    if (duration.inDays < 1) {
      return '${duration.inHours}h ${duration.inMinutes % 60}m';
    }
    return '${duration.inDays}d ${duration.inHours % 24}h';
  }

  static String responseTime(int? value) {
    return value == null ? '-' : '${value}ms';
  }

  static String percentFromRatio(int part, int total, {int decimals = 0}) {
    if (total <= 0) return '0%';
    return '${((part / total) * 100).toStringAsFixed(decimals)}%';
  }

  static String _two(int value) => value.toString().padLeft(2, '0');
}
