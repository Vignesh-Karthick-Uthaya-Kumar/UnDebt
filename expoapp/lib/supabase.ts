// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config';

export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

export const LOAN_TYPES = ['HomeLoan', 'PersonalLoan', 'CarLoan', 'CreditCard', 'BuyNowPayLater'];
export const TRANSACTION_TYPES = ['Savings', 'Checking', 'Investment', 'TransactionAccount'];