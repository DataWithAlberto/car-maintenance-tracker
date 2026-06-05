-- Modo Taller Pro: dossier técnico público por share_token.
-- El payload excluye importes, gastos, tickets, primas, franquicias y números de póliza.

CREATE OR REPLACE FUNCTION public.get_workshop_view(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle vehicles%ROWTYPE;
  v_records JSONB;
  v_documents JSONB;
  v_insurance JSONB;
  v_latest_reading JSONB;
  v_readings JSONB;
  v_anomalies JSONB;
BEGIN
  SELECT *
    INTO v_vehicle
    FROM public.vehicles
   WHERE share_token = p_token
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb)
    INTO v_records
    FROM (
      SELECT
        id,
        type,
        date,
        km_at_service,
        description,
        parts_location,
        next_service_km,
        next_service_date
      FROM public.maintenance_records
      WHERE vehicle_id = v_vehicle.id
      ORDER BY date DESC, created_at DESC
      LIMIT 50
    ) r;

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb), '[]'::jsonb)
    INTO v_documents
    FROM (
      SELECT
        id,
        doc_type,
        file_url,
        file_name,
        expiry_date,
        is_important,
        created_at
      FROM public.documents
      WHERE vehicle_id = v_vehicle.id
        AND is_important = TRUE
      ORDER BY expiry_date ASC NULLS LAST, created_at DESC
    ) d;

  SELECT row_to_json(i)::jsonb
    INTO v_insurance
    FROM (
      SELECT
        id,
        provider,
        coverage_type,
        payment_frequency,
        start_date,
        end_date,
        contact_phone
      FROM public.insurance_policies
      WHERE vehicle_id = v_vehicle.id
      ORDER BY
        CASE WHEN CURRENT_DATE BETWEEN start_date AND end_date THEN 0 ELSE 1 END,
        end_date DESC
      LIMIT 1
    ) i;

  SELECT row_to_json(o)::jsonb
    INTO v_latest_reading
    FROM (
      SELECT *
      FROM public.obd2_readings
      WHERE vehicle_id = v_vehicle.id
      ORDER BY created_at DESC
      LIMIT 1
    ) o;

  SELECT COALESCE(jsonb_agg(row_to_json(o)::jsonb), '[]'::jsonb)
    INTO v_readings
    FROM (
      SELECT *
      FROM public.obd2_readings
      WHERE vehicle_id = v_vehicle.id
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT 240
    ) o;

  SELECT COALESCE(jsonb_agg(row_to_json(a)::jsonb), '[]'::jsonb)
    INTO v_anomalies
    FROM (
      SELECT
        id,
        type,
        severity,
        value,
        threshold,
        message,
        dismissed,
        created_at
      FROM public.obd2_anomalies
      WHERE vehicle_id = v_vehicle.id
        AND COALESCE(dismissed, FALSE) = FALSE
      ORDER BY created_at DESC
      LIMIT 20
    ) a;

  RETURN jsonb_build_object(
    'vehicle', jsonb_build_object(
      'id', v_vehicle.id,
      'brand', v_vehicle.brand,
      'model', v_vehicle.model,
      'year', v_vehicle.year,
      'license_plate', v_vehicle.license_plate,
      'fuel_type', v_vehicle.fuel_type,
      'transmission', v_vehicle.transmission,
      'current_km', v_vehicle.current_km,
      'vin', v_vehicle.vin,
      'updated_at', v_vehicle.updated_at
    ),
    'records', v_records,
    'documents', v_documents,
    'insurance', v_insurance,
    'obd2', jsonb_build_object(
      'latest', v_latest_reading,
      'readings', v_readings,
      'anomalies', v_anomalies
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workshop_view(TEXT) TO anon, authenticated;
