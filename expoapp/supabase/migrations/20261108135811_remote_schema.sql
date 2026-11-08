SET local check_function_bodies = off;

CREATE TABLE "public"."accounts" (
  "account_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "accounts_pkey" PRIMARY KEY (account_id),
  "user_id"    uuid NOT NULL DEFAULT auth.uid()
);

ALTER TABLE "public"."accounts"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."account_type" AS ENUM (
  'HomeLoan',
  'CreditCard',
  'PersonalLoan',
  'BuyNowPayLater',
  'CarLoan',
  'Savings',
  'Checking',
  'Investment',
  'TransactionAccount'
);

ALTER TABLE "public"."accounts"
  ADD COLUMN "account_type" public.account_type NOT NULL;

ALTER TABLE "public"."accounts"
  ADD COLUMN "title" character varying(255);

ALTER TABLE "public"."accounts"
  ADD COLUMN "balance" numeric(15,2) NOT NULL;

ALTER TABLE "public"."accounts"
  ADD COLUMN "start_date" date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE "public"."accounts"
  ADD COLUMN "end_date" date;

ALTER TABLE "public"."accounts"
  ADD COLUMN "offset_config" jsonb DEFAULT '{"percentage": null, "offset_type": "No Offset", "linked_accounts": []}'::jsonb;

ALTER TABLE "public"."accounts"
  ADD COLUMN "payments" jsonb DEFAULT '[]'::jsonb;

ALTER TABLE "public"."accounts"
  ADD COLUMN "interest_rates" jsonb DEFAULT '[]'::jsonb;

ALTER TABLE "public"."accounts"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."accounts"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

CREATE TYPE "public"."offset_type" AS ENUM (
  'Full Offset',
  'Reduced Interest Rate',
  'Capped Percentage Balance',
  'No Offset'
);

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_accounts_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE INDEX idx_accounts_account_type ON public.accounts USING btree (account_type);

CREATE INDEX idx_accounts_interest_rates ON public.accounts USING gin (interest_rates);

CREATE INDEX idx_accounts_payments ON public.accounts USING gin (payments);

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accounts_updated_at();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_accounts_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."update_accounts_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_accounts_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_accounts_updated_at"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."accounts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."accounts" TO "service_role";

ALTER TABLE "public"."accounts"
  ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id);

CREATE POLICY "Users can delete own accounts" ON "public"."accounts"
  FOR DELETE
  TO "authenticated"
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own accounts" ON "public"."accounts"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can manage their own accounts" ON "public"."accounts"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own accounts" ON "public"."accounts"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own accounts" ON "public"."accounts"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = user_id));

