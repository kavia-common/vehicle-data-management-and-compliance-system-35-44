import React, { useMemo, useReducer, useState } from 'react';
import './vehicleManagement.css';

/**
 * Utility functions
 */
const VEHICLE_TYPES = ['Truck', 'Car', 'Bus', 'Tanker'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

// Mask card helper
const maskCard = (card) => {
  if (!card) return '';
  const last4 = card.slice(-4);
  return `**** **** **** ${last4}`;
};

// Simple validators
const isValidVehicleNumber = (value) => {
  if (!value) return false;
  const v = value.trim().toUpperCase();
  // permissive pattern example: 2-3 letters + 1-2 digits + 1-3 letters + 1-4 digits
  const pattern = /^[A-Z]{2,3}\d{1,2}[A-Z]{1,3}\d{1,4}$/; // e.g., MH12AB1234
  return pattern.test(v);
};

const isDigits = (value) => /^\d+$/.test(value);
const isValidFuelCard = (value) => {
  if (!value) return true;
  const v = value.trim();
  return isDigits(v) && v.length >= 12 && v.length <= 20;
};
const isValidPhone = (value) => {
  if (!value) return true;
  // Accept E.164 (+XXXXXXXXXXX) or 10 digits local
  return (/^\+\d{8,15}$/).test(value) || (/^\d{10}$/).test(value);
};
const isNonNegativeInt = (value) => {
  if (value === '' || value === null || value === undefined) return true;
  return (/^\d+$/).test(String(value));
};
const isFutureDate = (value) => {
  if (!value) return true;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
};

const initialState = {
  vehicles: [],
  // change logs keyed by vehicle number
  history: {},
};

// Actions for reducer
const ACTIONS = {
  ADD: 'ADD',
  BULK_ADD: 'BULK_ADD',
  UPDATE: 'UPDATE',
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD: {
      const v = action.payload;
      return {
        ...state,
        vehicles: [
          ...state.vehicles,
          {
            ...v,
            vehicleNumber: v.vehicleNumber.toUpperCase().trim(),
            lastUpdated: new Date().toISOString(),
          },
        ],
      };
    }
    case ACTIONS.BULK_ADD: {
      const list = action.payload || [];
      const now = new Date().toISOString();
      const normalized = list.map((v) => ({
        ...v,
        vehicleNumber: (v.vehicleNumber || '').toUpperCase().trim(),
        lastUpdated: now,
      }));
      return {
        ...state,
        vehicles: [...state.vehicles, ...normalized],
      };
    }
    case ACTIONS.UPDATE: {
      const { vehicleNumber, changes, updatedBy = 'user' } = action.payload;
      const idx = state.vehicles.findIndex(
        (x) => x.vehicleNumber === vehicleNumber
      );
      if (idx === -1) return state;
      const old = state.vehicles[idx];
      const updated = {
        ...old,
        ...changes,
        lastUpdated: new Date().toISOString(),
      };
      // record history entries
      const diffEntries = Object.keys(changes).map((key) => ({
        field: key,
        oldValue: old[key],
        newValue: changes[key],
        updatedBy,
        updatedAt: new Date().toISOString(),
      }));
      const nextHistory = { ...state.history };
      nextHistory[vehicleNumber] = [
        ...(nextHistory[vehicleNumber] || []),
        ...diffEntries,
      ];
      const nextVehicles = [...state.vehicles];
      nextVehicles[idx] = updated;
      return { ...state, vehicles: nextVehicles, history: nextHistory };
    }
    default:
      return state;
  }
}

/**
 * Toast component
 */
function Toast({ message, type = 'success', onClose }) {
  const [visible, setVisible] = useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onClose && onClose();
    }, 9000);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!visible) return null;
  return (
    <div role="status" aria-live="polite" className={`toast ${type}`}>
      <span>{message}</span>
      <button className="btn btn-ghost" onClick={() => { setVisible(false); onClose && onClose(); }} aria-label="Dismiss">×</button>
    </div>
  );
}

/**
 * Header with primary actions
 */
function HeaderBar({ onAdd, onBulk }) {
  return (
    <div className="vm-header">
      <h1 className="vm-title">Vehicle Management</h1>
      <div className="vm-actions">
        <button className="btn btn-secondary" onClick={onBulk} aria-label="Bulk Upload vehicles">
          ⬆️ Bulk Upload
        </button>
        <button className="btn btn-primary" onClick={onAdd} aria-label="Add New Vehicle">
          ＋ Add New Vehicle
        </button>
      </div>
    </div>
  );
}

/**
 * Filters toolbar
 */
function Filters({ filters, setFilters }) {
  return (
    <div className="vm-filters">
      <div className="form-control">
        <label htmlFor="search">Search</label>
        <input
          id="search"
          type="text"
          placeholder="Search by Vehicle or Card (last 4)"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>
      <div className="form-control">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="form-control">
        <label htmlFor="type">Vehicle Type</label>
        <select
          id="type"
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
        >
          <option value="">All</option>
          {VEHICLE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="form-control">
        <label htmlFor="org">Depot/Organization</label>
        <input
          id="org"
          type="text"
          placeholder="e.g., Mumbai Depot"
          value={filters.org}
          onChange={(e) => setFilters((f) => ({ ...f, org: e.target.value }))}
        />
      </div>
      <div className="vm-filters-actions">
        <button className="btn btn-ghost" onClick={() => setFilters({ search: '', status: '', type: '', org: '' })}>Clear Filters</button>
        <button className="btn btn-secondary" onClick={() => { /* TODO: export CSV */ }}>Export CSV</button>
      </div>
    </div>
  );
}

/**
 * Vehicle table
 */
function VehicleTable({ vehicles, onEdit }) {
  if (!vehicles.length) {
    return (
      <div className="vm-empty">
        <div className="vm-empty-illustration">🚚</div>
        <div>No vehicles yet. Add your first vehicle.</div>
      </div>
    );
  }
  return (
    <div className="vm-table-wrapper">
      <table className="vm-table" role="table">
        <thead>
          <tr>
            <th scope="col">Vehicle Number</th>
            <th scope="col">Vehicle Type</th>
            <th scope="col">Card Number</th>
            <th scope="col">Phone</th>
            <th scope="col">Status</th>
            <th scope="col">Last Updated</th>
            <th scope="col" aria-label="Actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.vehicleNumber}>
              <td>{v.vehicleNumber}</td>
              <td>{v.vehicleType || '-'}</td>
              <td>{maskCard(v.fuelCardNumber)}</td>
              <td>{v.phone || '-'}</td>
              <td>
                <span className={`pill ${v.status === 'Active' ? 'pill-success' : 'pill-danger'}`}>
                  {v.status || 'Active'}
                </span>
              </td>
              <td>{v.lastUpdated ? new Date(v.lastUpdated).toLocaleString() : '-'}</td>
              <td>
                <button className="btn btn-small" onClick={() => onEdit(v)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Add/Edit Vehicle Form
 */
function VehicleForm({ initial, onCancel, onSubmit, existingVehicleNumbers = [], mode = 'add' }) {
  const [form, setForm] = useState(() => ({
    vehicleNumber: initial?.vehicleNumber || '',
    vehicleType: initial?.vehicleType || '',
    fuelCardNumber: initial?.fuelCardNumber || '',
    odometer: initial?.odometer ?? '',
    phone: initial?.phone || '',
    licensePermit: initial?.licensePermit || '',
    insurancePolicy: initial?.insurancePolicy || '',
    rcExpiry: initial?.rcExpiry || '',
    notes: initial?.notes || '',
    status: initial?.status || 'Active',
    org: initial?.org || '',
    attachments: [],
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [maskCardField, setMaskCardField] = useState(true);
  const [dirty, setDirty] = useState(false);

  const setVal = (key, value) => {
    setDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = () => {
    const e = {};
    // Vehicle Number
    if (mode === 'add') {
      if (!form.vehicleNumber.trim()) {
        e.vehicleNumber = 'Vehicle Number is required.';
      } else if (!isValidVehicleNumber(form.vehicleNumber)) {
        e.vehicleNumber = 'Enter a valid registration number.';
      } else if (existingVehicleNumbers.includes(form.vehicleNumber.trim().toUpperCase())) {
        e.vehicleNumber = 'Vehicle already exists.';
      }
    } else {
      // edit mode: lock vehicle number display
    }
    // Vehicle Type
    if (!form.vehicleType) e.vehicleType = 'Select a vehicle type';

    // Fuel Card
    if (form.fuelCardNumber && !isValidFuelCard(form.fuelCardNumber)) {
      e.fuelCardNumber = 'Enter a valid card number.';
    }

    // Odometer
    if (form.odometer !== '' && !isNonNegativeInt(form.odometer)) {
      e.odometer = 'Enter a non-negative integer.';
    }

    // Phone
    if (form.phone && !isValidPhone(form.phone)) {
      e.phone = 'Enter a valid phone number.';
    }

    // Dates
    if (form.rcExpiry && !isFutureDate(form.rcExpiry)) {
      e.rcExpiry = 'Enter a valid future date.';
    }

    // Notes
    if (form.notes && form.notes.length > 500) {
      e.notes = 'Notes cannot exceed 500 characters.';
    }

    // Attachments
    if (form.attachments?.length) {
      if (form.attachments.length > 5) e.attachments = 'Maximum 5 files allowed.';
      form.attachments.forEach((f) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowed.includes(f.type)) {
          e.attachments = 'Only PDF, JPG, or PNG files are allowed.';
        }
        const max = 5 * 1024 * 1024;
        if (f.size > max) e.attachments = 'Each file must be <= 5MB.';
      });
    }
    setErrors(e);
    return e;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    const e = validate();
    if (Object.keys(e).length) return;
    try {
      setSubmitting(true);
      // Simulate network call
      await new Promise((res) => setTimeout(res, 800));
      const payload = {
        ...form,
        vehicleNumber: (form.vehicleNumber || initial?.vehicleNumber || '').toUpperCase().trim(),
      };
      onSubmit && onSubmit(payload);
    } catch (err) {
      // Display generic error toast handled by parent
    } finally {
      setSubmitting(false);
      setDirty(false);
    }
  };

  const confirmCancel = () => {
    if (dirty) {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!ok) return;
    }
    onCancel && onCancel();
  };

  return (
    <form className="vm-form" onSubmit={handleSubmit} aria-labelledby="vehicle-form-title">
      <h2 id="vehicle-form-title" className="section-title">{mode === 'add' ? 'Add New Vehicle' : 'Update Vehicle Details'}</h2>
      <div className="form-grid">
        <div className="form-control">
          <label htmlFor="vehicleNumber">Vehicle Number{mode === 'add' ? ' *' : ''}</label>
          {mode === 'add' ? (
            <input
              id="vehicleNumber"
              required
              aria-invalid={!!errors.vehicleNumber}
              aria-describedby={errors.vehicleNumber ? 'vehicleNumber-error' : undefined}
              value={form.vehicleNumber}
              onChange={(e) => setVal('vehicleNumber', e.target.value)}
              placeholder="e.g., MH12AB1234"
            />
          ) : (
            <input id="vehicleNumber" value={form.vehicleNumber} disabled />
          )}
          {errors.vehicleNumber && (
            <div id="vehicleNumber-error" className="error-text"> {errors.vehicleNumber} </div>
          )}
        </div>

        <div className="form-control">
          <label htmlFor="vehicleType">Vehicle Type *</label>
          <select
            id="vehicleType"
            required
            aria-invalid={!!errors.vehicleType}
            aria-describedby={errors.vehicleType ? 'vehicleType-error' : undefined}
            value={form.vehicleType}
            onChange={(e) => setVal('vehicleType', e.target.value)}
          >
            <option value="">Select type</option>
            {VEHICLE_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          {errors.vehicleType && <div id="vehicleType-error" className="error-text">{errors.vehicleType}</div>}
        </div>

        <div className="form-control">
          <label htmlFor="fuelCardNumber">Fuel Card Number</label>
          <div className="input-with-action">
            <input
              id="fuelCardNumber"
              type={maskCardField && form.fuelCardNumber ? 'password' : 'text'}
              inputMode="numeric"
              placeholder="Digits only, 12–20"
              aria-invalid={!!errors.fuelCardNumber}
              aria-describedby={errors.fuelCardNumber ? 'fuelCardNumber-error' : undefined}
              value={form.fuelCardNumber}
              onChange={(e) => setVal('fuelCardNumber', e.target.value.replace(/\s+/g, ''))}
              onBlur={() => setMaskCardField(true)}
            />
            <button
              type="button"
              className="btn btn-small btn-ghost"
              onClick={() => setMaskCardField((m) => !m)}
              aria-label={maskCardField ? 'Reveal card number' : 'Hide card number'}
            >
              {maskCardField ? 'Show' : 'Hide'}
            </button>
          </div>
          {errors.fuelCardNumber && <div id="fuelCardNumber-error" className="error-text">{errors.fuelCardNumber}</div>}
        </div>

        <div className="form-control">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            placeholder="+919876543210 or 9876543210"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            value={form.phone}
            onChange={(e) => setVal('phone', e.target.value)}
          />
          {errors.phone && <div id="phone-error" className="error-text">{errors.phone}</div>}
        </div>

        <div className="form-control">
          <label htmlFor="licensePermit">License/Permit</label>
          <input
            id="licensePermit"
            value={form.licensePermit}
            onChange={(e) => setVal('licensePermit', e.target.value)}
            placeholder="Alphanumeric"
          />
        </div>

        <div className="form-control">
          <label htmlFor="insurancePolicy">Insurance Policy</label>
          <input
            id="insurancePolicy"
            value={form.insurancePolicy}
            onChange={(e) => setVal('insurancePolicy', e.target.value)}
            placeholder="Policy Number"
          />
        </div>

        <div className="form-control">
          <label htmlFor="rcExpiry">RC/Registration Expiry</label>
          <input
            id="rcExpiry"
            type="date"
            aria-invalid={!!errors.rcExpiry}
            aria-describedby={errors.rcExpiry ? 'rcExpiry-error' : undefined}
            value={form.rcExpiry}
            onChange={(e) => setVal('rcExpiry', e.target.value)}
          />
          {errors.rcExpiry && <div id="rcExpiry-error" className="error-text">{errors.rcExpiry}</div>}
        </div>

        <div className="form-control">
          <label htmlFor="odometer">Odometer</label>
          <input
            id="odometer"
            inputMode="numeric"
            placeholder="0"
            aria-invalid={!!errors.odometer}
            aria-describedby={errors.odometer ? 'odometer-error' : undefined}
            value={form.odometer}
            onChange={(e) => setVal('odometer', e.target.value.replace(/\D+/g, ''))}
          />
          {errors.odometer && <div id="odometer-error" className="error-text">{errors.odometer}</div>}
        </div>

        <div className="form-control">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => setVal('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>

        <div className="form-control">
          <label htmlFor="org">Organization/Depot</label>
          <input
            id="org"
            placeholder="Required if multi-entity"
            value={form.org}
            onChange={(e) => setVal('org', e.target.value)}
          />
        </div>

        <div className="form-control form-col-span">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            rows={3}
            maxLength={500}
            value={form.notes}
            onChange={(e) => setVal('notes', e.target.value)}
            placeholder="Max 500 characters"
          />
          {errors.notes && <div className="error-text">{errors.notes}</div>}
        </div>

        <div className="form-control form-col-span">
          <label htmlFor="attachments">Attachments</label>
          <input
            id="attachments"
            type="file"
            accept=".pdf,image/jpeg,image/png"
            multiple
            onChange={(e) => {
              setDirty(true);
              setForm((f) => ({ ...f, attachments: Array.from(e.target.files || []) }));
            }}
          />
          {errors.attachments && <div className="error-text">{errors.attachments}</div>}
        </div>
      </div>

      <div className="form-footer">
        <button type="button" className="btn btn-ghost" onClick={confirmCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

/**
 * Bulk Upload Dialog (simplified, client-side validation demo)
 */
function BulkUploadDialog({ onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const validateFile = (f) => {
    if (!f) return 'Please choose a file.';
    const extOk = f.name.toLowerCase().endsWith('.xlsx');
    if (!extOk) return 'Only .xlsx files are allowed.';
    if (f.size > 5 * 1024 * 1024) return 'File size exceeds 5MB.';
    return '';
  };

  const handleUpload = async () => {
    const e = validateFile(file);
    if (e) {
      setError(e);
      return;
    }
    try {
      setUploading(true);
      // Simulate async job start
      await new Promise((res) => setTimeout(res, 800));
      // We cannot parse xlsx without deps; emulate success path and delegate server-side validation.
      onSubmit && onSubmit({ fileName: file.name, templateVersion: 'v0.1' });
      onClose && onClose();
    } catch (err) {
      setError('Could not upload file. Check your network and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="bulk-title">
      <div className="dialog">
        <div className="dialog-header">
          <h3 id="bulk-title">Bulk Upload</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="dialog-body">
          <p className="helper">Use the pre-defined template (v0.1). Max 2,000 rows.</p>
          <div className="bulk-actions">
            <button className="btn btn-secondary" onClick={() => alert('Template download coming soon')}>
              Download Template (.xlsx)
            </button>
          </div>
          <div className="form-control">
            <label htmlFor="xlsx">Upload .xlsx</label>
            <input
              id="xlsx"
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError('');
              }}
            />
            {file && <div className="file-preview">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</div>}
            {error && <div className="error-text">{error}</div>}
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * VehicleManagementPage - main container for list, filters, and forms
 */
export default function VehicleManagementPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', org: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [toast, setToast] = useState(null);

  const existingVehicleNumbers = useMemo(
    () => state.vehicles.map((v) => v.vehicleNumber.toUpperCase()),
    [state.vehicles]
  );

  const filtered = useMemo(() => {
    const s = (filters.search || '').trim().toLowerCase();
    return state.vehicles.filter((v) => {
      const matchSearch =
        !s ||
        v.vehicleNumber.toLowerCase().includes(s) ||
        (v.fuelCardNumber && v.fuelCardNumber.slice(-4).includes(s));
      const matchStatus = !filters.status || v.status === filters.status;
      const matchType = !filters.type || v.vehicleType === filters.type;
      const matchOrg = !filters.org || (v.org || '').toLowerCase().includes(filters.org.toLowerCase());
      return matchSearch && matchStatus && matchType && matchOrg;
    });
  }, [state.vehicles, filters]);

  const handleAddSubmit = (payload) => {
    dispatch({ type: ACTIONS.ADD, payload });
    setShowAdd(false);
    setToast({ message: 'Vehicle added successfully.', type: 'success' });
  };

  const handleEditSubmit = (payload) => {
    const vehicleNumber = editItem.vehicleNumber;
    const changes = { ...payload };
    delete changes.vehicleNumber; // keep original as locked id
    dispatch({ type: ACTIONS.UPDATE, payload: { vehicleNumber, changes, updatedBy: 'web-app' } });
    setEditItem(null);
    setToast({ message: 'Vehicle details updated successfully.', type: 'success' });
  };

  const onBulkSubmit = () => {
    // In real app, after parsing + validating, server returns summary; emulate success.
    setToast({ message: 'Bulk upload started. You will be notified on completion.', type: 'success' });
  };

  return (
    <div className="vm-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <HeaderBar onAdd={() => setShowAdd(true)} onBulk={() => setShowBulk(true)} />

      <Filters filters={filters} setFilters={setFilters} />

      <VehicleTable
        vehicles={filtered}
        onEdit={(v) => setEditItem(v)}
      />

      {showAdd && (
        <div className="drawer">
          <VehicleForm
            mode="add"
            onCancel={() => setShowAdd(false)}
            onSubmit={handleAddSubmit}
            existingVehicleNumbers={existingVehicleNumbers}
          />
        </div>
      )}

      {editItem && (
        <div className="drawer">
          <VehicleForm
            mode="edit"
            initial={editItem}
            onCancel={() => setEditItem(null)}
            onSubmit={handleEditSubmit}
            existingVehicleNumbers={existingVehicleNumbers}
          />
        </div>
      )}

      {showBulk && (
        <BulkUploadDialog
          onClose={() => setShowBulk(false)}
          onSubmit={onBulkSubmit}
        />
      )}
    </div>
  );
}
