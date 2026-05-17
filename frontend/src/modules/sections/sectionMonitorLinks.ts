import type { Monitor } from '../../shared/monitorApi';
import type { MonitorSection } from '../../shared/sectionsStore';

function dedupeSections(sections: MonitorSection[]) {
  const seenSectionIds = new Set<string>();
  const nextSections: MonitorSection[] = [];

  for (const section of sections) {
    const sectionId = String(section.id);

    if (seenSectionIds.has(sectionId)) {
      continue;
    }

    seenSectionIds.add(sectionId);
    nextSections.push(section);
  }

  return nextSections;
}

export function attachSectionsToMonitors(
  monitors: Monitor[],
  sections: MonitorSection[],
) {
  const sectionsByMonitorId = new Map<number, MonitorSection[]>();

  for (const section of sections) {
    for (const monitorId of section.monitorIds) {
      const currentSections = sectionsByMonitorId.get(monitorId) ?? [];
      currentSections.push(section);
      sectionsByMonitorId.set(monitorId, currentSections);
    }
  }

  return monitors.map((monitor) => ({
    ...monitor,
    sections: dedupeSections([
      ...monitor.sections,
      ...(sectionsByMonitorId.get(monitor.id) ?? []),
    ]),
  }));
}
