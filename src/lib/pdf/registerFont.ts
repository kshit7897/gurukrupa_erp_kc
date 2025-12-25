import path from 'path';
import { Font } from '@react-pdf/renderer';

export function registerAppFont(): string {
  let fontFamily = 'NotoSans';
  try {
    const fontPath = path.join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', 'NotoSans-Regular.ttf');
    Font.register({
      family: 'NotoSans',
      src: fontPath,
    });
  } catch (e) {
    fontFamily = 'Helvetica';
  }
  return fontFamily;
}
