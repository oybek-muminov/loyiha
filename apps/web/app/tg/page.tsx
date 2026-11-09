import type { Metadata } from 'next';
import { MiniAppHome } from './_components/mini-app-home';

export const metadata: Metadata = {
  title: 'UniverAcademy — Mini App',
};

export default function TelegramMiniAppPage() {
  return <MiniAppHome />;
}
