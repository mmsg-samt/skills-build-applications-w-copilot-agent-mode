import { CapabilityCard } from './CapabilityCard.js';

type Workout = { title: string; reason?: string };

export default function Workouts() {
  return <CapabilityCard<Workout>
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    endpoint={`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`}
    collection="suggestions"
    emptyMessage="No workout suggestions yet."
    renderItem={(workout) => <>{workout.title}{workout.reason ? ` · ${workout.reason}` : ''}</>}
  />;
}
