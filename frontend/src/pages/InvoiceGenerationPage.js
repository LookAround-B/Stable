import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import DatePicker from '../components/shared/DatePicker';

import usePermissions from '../hooks/usePermissions';
import { Printer, SlidersHorizontal, TrendingUp } from 'lucide-react';

const esc = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const InvoiceGenerationPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [instructors, setInstructors] = useState([]);

  const [filters, setFilters] = useState({
    instructorId: user?.designation === 'Instructor' ? user.id : '',
    startDate: getMonthStart(),
    endDate: getMonthEnd(),
  });

  function getMonthStart() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  }

  function getMonthEnd() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  const loadInstructors = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      const instructorsList = (response.data.data || []).filter(
        (emp) => emp.designation === 'Instructor'
      );
      setInstructors(instructorsList);
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  }, []);

  // Load instructors if user is Stable Manager
  useEffect(() => {
    if (user?.designation === 'Stable Manager' || ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation)) {
      loadInstructors();
    }
  }, [user?.designation, loadInstructors]);

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();

    if (!filters.startDate || !filters.endDate) {
      setMessage('Please select both start and end dates');
      setMessageType('error');
      return;
    }

    if (new Date(filters.startDate) > new Date(filters.endDate)) {
      setMessage('Start date must be before end date');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/eirs/invoice/generate', {
        instructorId: filters.instructorId || undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      setInvoice(response.data.data);
      setMessage('Invoice generated successfully');
      setMessageType('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to generate invoice');
      setMessageType('error');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;

    const printWindow = window.open('', '', 'width=900,height=600');
    if (printWindow) {
      printWindow.document.write(generatePDFContent(invoice));
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePDFContent = (invoiceData) => {
    const recordsHTML = invoiceData.records
      .map(
        (r) => `
        <tr>
          <td>${esc(new Date(r.date).toLocaleDateString())}</td>
          <td>${esc(r.horse.name)}</td>
          <td>${esc(r.rider.fullName)}</td>
          <td>${esc(r.workType)}</td>
          <td>${esc(r.duration)}</td>
          <td>${esc(r.notes || '-')}</td>
        </tr>
      `
      )
      .join('');

    const workTypeSummary = Object.entries(invoiceData.summary.byWorkType)
      .map(
        ([type, data]) => `
        <tr>
          <td>${esc(type)}</td>
          <td>${esc(data.count)}</td>
          <td>${esc(data.duration)} min</td>
          <td>${Math.round((data.duration / 60) * 100) / 100} hrs</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { text-align: center; color: #2c3e50; }
          .header-info { margin: 20px 0; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          .header-info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #3498db; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          .summary { background-color: #ecf0f1; padding: 15px; margin: 20px 0; border-left: 4px solid #3498db; }
          .summary-stat { display: inline-block; margin-right: 30px; }
          .summary-stat strong { color: #2c3e50; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #7f8c8d; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>{t("EIRS Invoice")}</h1>
        
        <div class="header-info">
          <p><strong>{t("Instructor:")}</strong> ${esc(invoiceData.instructor.fullName)}</p>
          <p><strong>{t("Invoice ID:")}</strong> ${esc(invoiceData.invoiceId)}</p>
          <p><strong>{t("Period:")}</strong> ${esc(new Date(invoiceData.periodStart).toLocaleDateString())} to ${esc(new Date(invoiceData.periodEnd).toLocaleDateString())}</p>
          <p><strong>{t("Generated:")}</strong> ${esc(new Date(invoiceData.generatedDate).toLocaleString())}</p>
        </div>

        <h2>{t("Work Sessions")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("Date")}</th>
              <th>{t("Horse")}</th>
              <th>{t("Rider")}</th>
              <th>{t("Type")}</th>
              <th>Duration (min)</th>
              <th>{t("Notes")}</th>
            </tr>
          </thead>
          <tbody>
            ${recordsHTML}
          </tbody>
        </table>

        <h2>{t("Summary by Work Type")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("Work Type")}</th>
              <th>{t("Sessions")}</th>
              <th>{t("Total Duration")}</th>
              <th>{t("Total Hours")}</th>
            </tr>
          </thead>
          <tbody>
            ${workTypeSummary}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-stat">
            <strong>{t("Total Sessions:")}</strong> ${esc(invoiceData.summary.totalSessions)}
          </div>
          <div class="summary-stat">
            <strong>{t("Total Duration:")}</strong> ${esc(invoiceData.summary.totalDuration)} minutes
          </div>
          <div class="summary-stat">
            <strong>{t("Total Hours:")}</strong> ${esc(invoiceData.summary.totalHours)}
          </div>
        </div>

        <div class="footer">
          <p>{t("This is an automated invoice generated from the EIRS system.")}</p>
          <p>{t("For queries, contact the administration.")}</p>
        </div>
      </body>
      </html>
    `;
  };

  if (!p.viewInvoiceGeneration) return <Navigate to="/dashboard" replace />;

  return (
    <div className="invoice-generation-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="lovable-header-kicker mb-2">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>{t("FINANCIAL CONTROL CENTER")}</span>
          </div>
          <h1 className="display-sm text-foreground mt-1">{t("Invoice Generation")}</h1>
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            messageType === 'error'
              ? 'bg-destructive/15 text-destructive border border-destructive/30'
              : 'bg-success/15 text-success border border-success/30'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
            <div className="flex items-center gap-2 mb-5">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <h2 className="heading-md text-foreground">{t("Parameters")}</h2>
            </div>

            <form onSubmit={handleGenerateInvoice} className="space-y-4">
              {user?.designation !== 'Instructor' && (
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">{t("SELECT INSTRUCTOR")}</label>
                  <SearchableSelect
                    id="instructorId"
                    value={filters.instructorId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        instructorId: e.target.value,
                      }))
                    }
                    placeholder={t("Select instructor...")}
                    options={[
                      { value: '', label: 'All Instructors' },
                      ...instructors.map((i) => ({ value: i.id, label: i.fullName })),
                    ]}
                  />
                </div>
              )}

              <div>
                <label className="label-sm text-muted-foreground block mb-2">{t("DATE RANGE")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <DatePicker
                    value={filters.startDate}
                    onChange={(val) =>
                      setFilters((prev) => ({
                        ...prev,
                        startDate: val,
                      }))
                    }
                    placeholder="Start date"
                    required
                  />
                  <DatePicker
                    value={filters.endDate}
                    onChange={(val) =>
                      setFilters((prev) => ({
                        ...prev,
                        endDate: val,
                      }))
                    }
                    placeholder="End date"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase"
                disabled={loading}
              >
                {loading ? 'Generating Invoice...' : 'Generate Invoice'}
              </button>
            </form>
          </div>

          <div className="bg-surface-container-highest rounded-lg p-5 edge-glow border-l-2 border-primary">
            <p className="label-sm text-primary mb-1">{t("ESTIMATED TOTAL HOURS")}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-foreground mono-data">
                {invoice ? invoice.summary.totalHours.toFixed(2) : '0.00'}
              </p>
              <TrendingUp className="w-8 h-8 text-primary/30" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {invoice ? `${invoice.summary.totalSessions} verified sessions` : 'Awaiting invoice generation'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-surface-container-highest rounded-lg edge-glow overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-surface-container-high border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="label-sm text-muted-foreground">
                  PREVIEW: {invoice ? invoice.invoiceId : 'NOT GENERATED'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!invoice}
                  className="p-2 rounded hover:bg-surface-container-highest text-muted-foreground disabled:opacity-40"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {invoice ? (
              <div className="p-4 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-wider">{t("THE NEON STABLE")}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      EIRS Operations Ledger
                      <br />
                      Instructor Billing Console
                      <br />
                      Internal Generated Statement
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-surface-container-high/50 tracking-widest">{t("INVOICE")}</p>
                    <div className="text-xs text-muted-foreground mt-2 space-y-0.5 mono-data">
                      <p>NO: <span className="text-foreground font-medium">{invoice.invoiceId}</span></p>
                      <p>DATE: <span className="text-foreground font-medium">{new Date(invoice.generatedDate).toLocaleDateString('en-GB')}</span></p>
                      <p>DUE: <span className="text-foreground font-medium">{new Date(invoice.periodEnd).toLocaleDateString('en-GB')}</span></p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="label-sm text-primary mb-1">{t("INSTRUCTOR ENTITY")}</p>
                    <p className="font-semibold text-foreground">{invoice.instructor.fullName}</p>
                    <p className="text-xs text-muted-foreground mono-data mt-1">
                      ROLE: {invoice.instructor.designation}
                      <br />
                      PERIOD: {new Date(invoice.periodStart).toLocaleDateString('en-GB')} - {new Date(invoice.periodEnd).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div>
                    <p className="label-sm text-primary mb-1">{t("PAYMENT CHANNEL")}</p>
                    <p className="font-semibold text-foreground">{t("Stable Ops Ledger")}</p>
                    <p className="text-xs text-muted-foreground mono-data mt-1">
                      VERIFIED BY EIRS
                      <br />
                      GENERATED FROM DAILY WORK RECORDS
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 text-left label-sm text-muted-foreground">{t("SESSION DESCRIPTION")}</th>
                        <th className="py-2 text-right label-sm text-muted-foreground">{t("HRS")}</th>
                        <th className="py-2 text-right label-sm text-muted-foreground">{t("TYPE")}</th>
                        <th className="py-2 text-right label-sm text-muted-foreground">{t("RIDER / HORSE")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.records.map((record) => (
                        <tr key={record.id} className="border-b border-border/30">
                          <td className="py-3">
                            <span className="font-semibold text-foreground block">
                              {new Date(record.date).toLocaleDateString('en-GB')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {record.notes || 'Verified EIRS work log'}
                            </span>
                          </td>
                          <td className="py-3 text-right mono-data text-foreground">
                            {(record.duration / 60).toFixed(2)}
                          </td>
                          <td className="py-3 text-right text-foreground">{record.workType}</td>
                          <td className="py-3 text-right text-muted-foreground">
                            {record.rider.fullName} / {record.horse.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("Total Sessions")}</span>
                    <span className="mono-data">{invoice.summary.totalSessions}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t("Total Duration")}</span>
                    <span className="mono-data">{invoice.summary.totalDuration} min</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between">
                    <span className="text-primary font-bold">{t("TOTAL HOURS")}</span>
                    <span className="text-xl mono-data font-bold text-foreground">
                      {invoice.summary.totalHours.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/30 pt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[280px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-2 text-left label-sm text-muted-foreground">{t("WORK TYPE")}</th>
                          <th className="py-2 text-right label-sm text-muted-foreground">{t("SESSIONS")}</th>
                          <th className="py-2 text-right label-sm text-muted-foreground">{t("HOURS")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(invoice.summary.byWorkType).map(([type, data]) => (
                          <tr key={type} className="border-b border-border/30">
                            <td className="py-3 text-foreground font-medium">{type}</td>
                            <td className="py-3 text-right mono-data text-foreground">{data.count}</td>
                            <td className="py-3 text-right mono-data text-foreground">{(data.duration / 60).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col justify-end">
                    <p className="text-[10px] text-muted-foreground max-w-[300px]">
                      All invoice values on this page are derived from verified EIRS work logs. No mock rate or payment data is introduced into the preview.
                    </p>
                    <p className="label-sm text-muted-foreground mt-4">{t("AUTHORIZED DIGITALLY")}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Generate an invoice by selecting an instructor and date range.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerationPage;

