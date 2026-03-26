
interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'priority';
}

const statusColors: Record<string, string> = {
  'Active': 'bg-success/15 text-success',
  'Inactive': 'bg-muted text-muted-foreground',
  'On Leave': 'bg-warning/15 text-warning',
  'Resting': 'bg-secondary/15 text-secondary',
  'Medical': 'bg-destructive/15 text-destructive',
  'Retired': 'bg-muted text-muted-foreground',
  'Completed': 'bg-success/15 text-success',
  'In Progress': 'bg-primary/15 text-primary',
  'Pending': 'bg-warning/15 text-warning',
  'Overdue': 'bg-destructive/15 text-destructive',
  'In Stock': 'bg-success/15 text-success',
  'Low Stock': 'bg-warning/15 text-warning',
  'Out of Stock': 'bg-destructive/15 text-destructive',
  'Critical': 'bg-destructive/15 text-destructive',
  'High': 'bg-warning/15 text-warning',
  'Medium': 'bg-primary/15 text-primary',
  'Low': 'bg-muted text-muted-foreground',
  'Entry': 'bg-success/15 text-success',
  'Exit': 'bg-secondary/15 text-secondary',
  'Staff': 'bg-primary/15 text-primary',
  'Visitor': 'bg-warning/15 text-warning',
  'Approved': 'bg-success/15 text-success',
  'Rejected': 'bg-destructive/15 text-destructive',
  'Stallion': 'bg-primary/15 text-primary',
  'Mare': 'bg-destructive/15 text-destructive',
  'Checked In': 'bg-success/15 text-success',
  'Checked Out': 'bg-muted text-muted-foreground',
  'Absent': 'bg-destructive/15 text-destructive',
  'Present': 'bg-success/15 text-success',
  'Late': 'bg-warning/15 text-warning',
  'Half Day': 'bg-secondary/15 text-secondary',
  'Scheduled': 'bg-primary/15 text-primary',
  'Cancelled': 'bg-destructive/15 text-destructive',
  'Good': 'bg-success/15 text-success',
  'Fair': 'bg-warning/15 text-warning',
  'Poor': 'bg-destructive/15 text-destructive',
  'Replace': 'bg-destructive/15 text-destructive',
  'Passed': 'bg-success/15 text-success',
  'Issues Found': 'bg-warning/15 text-warning',
  'Draft': 'bg-muted text-muted-foreground',
  'Sent': 'bg-primary/15 text-primary',
  'Paid': 'bg-success/15 text-success',
  'Issued': 'bg-warning/15 text-warning',
  'Appealed': 'bg-secondary/15 text-secondary',
  'Waived': 'bg-muted text-muted-foreground',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = statusColors[status] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${colors}`}>
      {status}
    </span>
  );
}
