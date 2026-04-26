import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..');

describe('page localization coverage', () => {
  it('routes grass bedding and instructor incentives through i18n and registers page keys', () => {
    const grassSource = fs.readFileSync(path.join(__dirname, 'GrassBeddingPage.js'), 'utf8');
    const incentivesSource = fs.readFileSync(path.join(__dirname, 'InstructorIncentivesPage.js'), 'utf8');
    const i18nSource = fs.readFileSync(path.join(repoRoot, 'src', 'context', 'I18nContext.js'), 'utf8');

    expect(grassSource).toContain('t("Grass & Bedding")');
    expect(grassSource).toContain('t("Track grass and bedding collection, load receipt, and tonnage.")');
    expect(grassSource).toContain('t("Add Entry")');
    expect(grassSource).toContain('t("Delete Entry")');

    expect(incentivesSource).toContain('t("Instructor Incentives")');
    expect(incentivesSource).toContain("t('Add Incentive')");
    expect(incentivesSource).toContain("t('Export Incentives')");
    expect(incentivesSource).toContain("t('Delete Incentive')");

    expect(i18nSource).toContain('"Grass & Bedding"');
    expect(i18nSource).toContain('"Instructor Incentives"');
    expect(i18nSource).toContain('"Add Incentive"');
  });

  it('routes bookings strings through i18n and the booking helper translator', () => {
    const tasksSource = fs.readFileSync(path.join(__dirname, 'TasksPage.js'), 'utf8');
    const bookingLibSource = fs.readFileSync(path.join(repoRoot, 'src', 'lib', 'taskBookings.js'), 'utf8');
    const i18nSource = fs.readFileSync(path.join(repoRoot, 'src', 'context', 'I18nContext.js'), 'utf8');
    const layoutSource = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'MainLayout.js'), 'utf8');
    const globalCssSource = fs.readFileSync(path.join(repoRoot, 'src', 'styles', 'global.css'), 'utf8');

    expect(tasksSource).toContain("isBookingsRoute ? 'Booking Operations' : 'Task Operations'");
    expect(tasksSource).toContain("isBookingsRoute ? 'Bookings Management' : 'Tasks Management'");
    expect(tasksSource).toContain("isBookingsRoute ? 'Create New Booking' : 'Create New Task'");
    expect(tasksSource).toContain("getBookingSummary(task, t)");
    expect(tasksSource).toContain("t('Submit Task Evidence')");
    expect(tasksSource).toContain("label: t(option.label)");
    expect(tasksSource).toContain('className="task-card-booking-summary"');
    expect(tasksSource).toContain('className="task-card-booking-history"');

    expect(bookingLibSource).toContain('translate = (value) => value');
    expect(bookingLibSource).toContain("translate('Payment')");
    expect(bookingLibSource).toContain("translate('Unpaid')");

    expect(i18nSource).toContain('"Bookings Management"');
    expect(i18nSource).toContain('"Create Booking"');
    expect(i18nSource).toContain('"Submit Task Evidence"');

    expect(layoutSource).toContain("const { t, lang } = useI18n();");
    expect(layoutSource).toContain("heading.dataset.orbitHeadingText === headingText");
    expect(layoutSource).toContain("[routeSkeleton, location.pathname, lang]");

    expect(globalCssSource).toContain('.tasks-page.tasks-page--bookings .task-card.task-card-lovable');
    expect(globalCssSource).toContain('height: auto;');
    expect(globalCssSource).toContain('.tasks-page.tasks-page--bookings .task-card-booking-summary');
  });
});
