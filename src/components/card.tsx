import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * Opaque content container. Deliberately NOT translucent: rupee amounts and
 * meter readings need stable contrast, and glass behind a number column makes
 * it unreadable the moment anything scrolls underneath. Glass goes on chrome
 * (`<Surface>`), never on content.
 */
export function Card({
  children,
  className,
  elevated = false,
  ...rest
}: ViewProps & { children?: ReactNode; elevated?: boolean }) {
  return (
    <View
      className={[
        'rounded-lg border border-border bg-surface p-4',
        elevated && 'bg-surface2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}>
      {children}
    </View>
  );
}

/** Hairline divider for inside a Card. */
export function Divider({ className }: { className?: string }) {
  return <View className={['h-px bg-border', className].filter(Boolean).join(' ')} />;
}
