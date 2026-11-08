import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import DataTable from '../components/DataTable';
import LoanProjectionSummary from '../components/common/LoanProjectionSummary';
import ProjectionChart from '../components/common/ProjectionChart';
import ProjectionPeriodPicker from '../components/common/ProjectionPeriodPicker';
import ScreenHeader from '../components/common/ScreenHeader';
import { FinancialProjection } from '../lib/financialProjection';

interface LoansScreenProps {
  loans: any[];
  totalDebt: number;
  compact: boolean;
  projection: FinancialProjection;
  years: number;
  selectedYears: number | null;
  onProjectionYearsChange: (years: number | null) => void;
  selectedFinancialYear: number | null;
  onSelectFinancialYear: (startYear: number | null) => void;
  financialYearStartMonth: number;
  selectedSeriesIds: string[] | null;
  onToggleSeries: (id: string) => void;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export default function LoansScreen({
  loans,
  totalDebt,
  compact,
  projection,
  years,
  selectedYears,
  onProjectionYearsChange,
  selectedFinancialYear,
  onSelectFinancialYear,
  financialYearStartMonth,
  selectedSeriesIds,
  onToggleSeries,
  onAdd,
  onEdit,
  onDelete
}: LoansScreenProps) {
  const chartSeries = [
    ...projection.scheduledLoanSeries,
    ...projection.loanSeries,
  ];

  return (
    <ScrollView contentContainerStyle={[styles.container, compact && styles.compactContainer]}>
      <ScreenHeader
        category="FINANCE"
        title="Loans"
        subtitle="Track balances, interest rates and repayments."
        buttonLabel="+ Add loan"
        onPressButton={onAdd}
      />

      <ProjectionPeriodPicker
        years={years}
        defaultYears={projection.defaultYears}
        selectedYears={selectedYears}
        onChange={onProjectionYearsChange}
        selectedFinancialYear={selectedFinancialYear}
        onSelectFinancialYear={onSelectFinancialYear}
        financialYearStartMonth={financialYearStartMonth}
      />
      <LoanProjectionSummary
        years={years}
        compact={compact}
        loanCount={loans.length}
        outstanding={totalDebt}
        scheduledMonthlyRepayment={projection.scheduledMonthlyRepayments}
        additionalMonthlyRepayment={projection.additionalMonthlyRepayments}
        scheduledInterest={projection.scheduledInterestByYear[years]}
        scheduledBalance={projection.scheduledLoanBalancesByYear[years]}
        actualInterest={projection.actualInterestByYear[years]}
        interestSaved={Math.max(
          0,
          projection.scheduledInterestByYear[years] - projection.actualInterestByYear[years]
        )}
        actualBalance={projection.loanBalancesByYear[years]}
      />

      <ProjectionChart
        title="Loan balance forecast"
        series={chartSeries}
        years={years}
        compact={compact}
        selectedSeriesIds={selectedSeriesIds}
        onToggleSeries={onToggleSeries}
      />

      <DataTable
        sectionTitle="All loans"
        itemCountText={`${loans.length} ${loans.length === 1 ? 'loan' : 'loans'}`}
        data={loans}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 32, paddingBottom: 40 },
  compactContainer: { padding: 16 },
});
