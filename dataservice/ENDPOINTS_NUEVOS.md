# 3 endpoints nuevos para Data Service

Créalos en tu Data App igual que los anteriores: Path y Method exactos, SQL, tipos de parámetros y **Deploy**. Con estos son 30 endpoints.

## 1. PUT /proveedor_productos

Asigna un producto a un proveedor con su costo y código. Si la relación ya existía (inactiva), la reactiva con los datos nuevos.

| Parámetro | Type | Ubicación |
|---|---|---|
| `proveedor_id` | INTEGER | Body |
| `producto_id` | INTEGER | Body |
| `codigo_proveedor` | STRING | Body |
| `costo_actual` | NUMBER | Body |

```sql
USE papeleria_costa_azul;
INSERT INTO proveedor_productos (proveedor_id, producto_id, codigo_proveedor, costo_actual, activo)
VALUES (${proveedor_id}, ${producto_id}, NULLIF(${codigo_proveedor}, ''), ${costo_actual}, 1)
ON DUPLICATE KEY UPDATE
  codigo_proveedor = VALUES(codigo_proveedor),
  costo_actual = VALUES(costo_actual),
  activo = 1;
SELECT id FROM proveedor_productos
WHERE proveedor_id = ${proveedor_id} AND producto_id = ${producto_id};
```

## 2. POST /proveedor_productos

Actualiza el código, el costo o el estado (activo/inactivo) de un producto con un proveedor.

| Parámetro | Type | Ubicación |
|---|---|---|
| `id` | INTEGER | Body |
| `codigo_proveedor` | STRING | Body |
| `costo_actual` | NUMBER | Body |
| `activo` | INTEGER | Body |

```sql
USE papeleria_costa_azul;
UPDATE proveedor_productos
SET codigo_proveedor = NULLIF(${codigo_proveedor}, ''),
    costo_actual = ${costo_actual},
    activo = ${activo}
WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

## 3. DELETE /proveedor_productos/{id}

Quita un producto de un proveedor. Falla si ya hay compras con esa relación (la API la desactiva en su lugar).

| Parámetro | Type | Ubicación |
|---|---|---|
| `id` | INTEGER | Path |

```sql
USE papeleria_costa_azul;
DELETE FROM proveedor_productos WHERE id = ${id};
SELECT ROW_COUNT() AS afectados;
```

