CREATE TABLE movies (id SERIAL primary key, title VARCHAR);


CREATE OR REPLACE FUNCTION notify_table_update()
  RETURNS TRIGGER 
  LANGUAGE PLPGSQL  
  AS
$$
BEGIN
  IF TG_OP = 'INSERT' THEN
     PERFORM pg_notify(
        'insert_' || TG_TABLE_NAME,
        row_to_json(NEW)::text
     );
  END IF;

  IF TG_OP = 'DELETE' THEN
     PERFORM pg_notify(
        'delete_' || TG_TABLE_NAME,
        row_to_json(OLD)::text
     );
  END IF;
  RETURN null;
END;
$$;


CREATE TRIGGER movies_notify_trigger
    AFTER UPDATE OR INSERT OR DELETE ON movies
    FOR EACH ROW
    EXECUTE PROCEDURE notify_table_update();
