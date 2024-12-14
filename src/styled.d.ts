// styled.d.ts
import 'styled-components';
import { type ThemeColors, type Colors } from './colors';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: Record<Colors, Color>,
    elements: Record<ThemeColors, Color>
  }
}