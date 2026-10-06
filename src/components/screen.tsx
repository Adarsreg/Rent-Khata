import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

import { useLayout } from '@/theme/layout';
import { TAB_BAR_CLEARANCE } from '@/theme/tokens';

import { Text } from './text';

/**
 * Standard scrolling page body.
 *
 * Exists so responsiveness is not re-decided on every screen. It caps the
 * reading column and centres it once the window is wider than a phone —
 * without a cap, a rent row stretched across a landscape tablet puts the
 * amount a hand's width from the unit it belongs to, which is exactly how an
 * app announces that nobody ever opened it on a tablet.
 */
export function ScreenScroll({
  children,
  topInset = 0,
  wide = false,
  ...rest
}: ScrollViewProps & { children: ReactNode; topInset?: number; wide?: boolean }) {
  const { gutter, sectionGap, contentMaxWidth, dashboardMaxWidth } = useLayout();
  const maxWidth = wide ? dashboardMaxWidth : contentMaxWidth;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: topInset,
        paddingBottom: TAB_BAR_CLEARANCE,
        paddingHorizontal: gutter,
        alignItems: 'center',
      }}
      showsVerticalScrollIndicator={false}
      {...rest}>
      <View style={{ width: '100%', maxWidth, gap: sectionGap }}>{children}</View>
    </ScrollView>
  );
}

/**
 * A titled block of content.
 *
 * Replaces wrapping everything in an identical rounded card. Grouping by a
 * quiet heading gives real hierarchy; a page of same-radius, same-shadow
 * cards flattens everything to one level and is the clearest sign of a UI
 * assembled rather than designed.
 */
export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const hasHeader = Boolean(title || action);

  return (
    <View className="gap-3">
      {hasHeader ? (
        <View className="flex-row items-center justify-between">
          {/* Sentence case, never a tracked-out all-caps eyebrow. */}
          {title ? (
            <Text variant="kicker" tone="secondary">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Hairline-separated rows. The default way to show a list of label/value
 * pairs — lighter than giving every row its own card.
 */
export function Rows({ children }: { children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-md border border-border bg-surface">{children}</View>
  );
}

export function Row({
  label,
  value,
  tone = 'default',
  last = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'paid' | 'overdue' | 'secondary';
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-baseline justify-between px-4 py-3.5 ${
        last ? '' : 'border-b border-border'
      }`}>
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="body" numeric weight="medium" tone={tone}>
        {value}
      </Text>
    </View>
  );
}
