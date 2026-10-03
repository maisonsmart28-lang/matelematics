-- Effective callable SECURITY DEFINER surface, including PUBLIC grants.
-- No function is invoked; no function body or data is printed.
SELECT n.nspname AS schema_name,
       p.oid::regprocedure::text AS function_signature,
       pg_get_userbyid(p.proowner) AS owner,
       EXISTS (
         SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
         WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
       ) AS public_execute,
       p.proconfig AS function_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prosecdef
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND has_schema_privilege('matelematics_ingest_native',n.oid,'USAGE')
  AND has_function_privilege('matelematics_ingest_native',p.oid,'EXECUTE')
ORDER BY n.nspname,p.oid::regprocedure::text;

SELECT count(*) AS executable_security_definer_functions
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prosecdef
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND has_schema_privilege('matelematics_ingest_native',n.oid,'USAGE')
  AND has_function_privilege('matelematics_ingest_native',p.oid,'EXECUTE');
