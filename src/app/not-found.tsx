import { AppFaultScreen } from '@/components/AppFaultScreen';

export default function NotFound() {
  return (
    <AppFaultScreen
      code="۴۰۴"
      title="این صفحه پیدا نشد"
      message="آدرس اشتباه است یا این صفحه دیگر وجود ندارد."
    />
  );
}
