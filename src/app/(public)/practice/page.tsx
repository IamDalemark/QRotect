import { redirect } from 'next/navigation';

// Keep old bookmarks useful without retaining the retired practice screen.
export default function Page() {
  redirect('/directory');
}
