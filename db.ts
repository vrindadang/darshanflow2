
/**
 * DarshanFlow Multi-Adapter Database Service
 * Supports: Supabase (SQL), MongoDB (NoSQL), or Local (Browser)
 */

const CONFIG = {
  // --- OPTION A: SUPABASE (Active) ---
  SUPABASE_URL: 'https://shamowqhlntodbxpnakz.supabase.co', 
  SUPABASE_KEY: 'sb_publishable_9c1jWxVfGjMx2xSdBMemTQ_fDN0HDl4',

  // --- OPTION B: MONGODB ---
  MONGO_APP_ID: 'YOUR_APP_ID',
  MONGO_API_KEY: 'al-U12b3tCyH-J4a6WIBtQbxlY6EcRBlOeaWO8Vxr3ipB5',
  
  DATABASE: 'DarshanFlow',
  CLUSTER: 'DarshanFlow'
};

export interface ConnectionStatus {
  ok: boolean;
  message: string;
  error?: string;
  tablesMissing?: string[];
}

class DataService {
  private _lastStatus: ConnectionStatus | null = null;

  get mode() {
    if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY && CONFIG.SUPABASE_URL.includes('supabase.co')) return 'SUPABASE';
    if (CONFIG.MONGO_APP_ID !== 'YOUR_APP_ID' && CONFIG.MONGO_APP_ID.length > 5) return 'MONGODB';
    return 'LOCAL';
  }

  get isLive() {
    return this.mode !== 'LOCAL';
  }

  // Getter to access status from outside without re-triggering tests unnecessarily
  get lastStatus() {
    return this._lastStatus;
  }

  async testConnection(): Promise<ConnectionStatus> {
    if (this.mode === 'LOCAL') {
      this._lastStatus = { ok: true, message: 'Running in Local mode.' };
      return this._lastStatus;
    }
    
    if (this.mode === 'SUPABASE') {
      try {
        const tables = ['requests', 'budgets', 'budgetLogs', 'budgetRequests', 'notifications'];
        const missing: string[] = [];
        
        // Parallel check for performance
        const checks = await Promise.all(tables.map(async (table) => {
          const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${table}?limit=1`, {
            headers: { 
              'apikey': CONFIG.SUPABASE_KEY, 
              'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}` 
            }
          });
          return { table, ok: res.ok };
        }));

        checks.forEach(c => { if (!c.ok) missing.push(c.table); });

        if (missing.length > 0) {
          this._lastStatus = { ok: false, message: 'Connected to Supabase, but tables are missing.', tablesMissing: missing };
        } else {
          this._lastStatus = { ok: true, message: 'Cloud connection healthy and tables ready.' };
        }
        return this._lastStatus;
      } catch (e: any) {
        this._lastStatus = { ok: false, message: 'Cannot reach Supabase servers.', error: e.message };
        return this._lastStatus;
      }
    }
    
    this._lastStatus = { ok: true, message: 'Connection test not implemented for this mode.' };
    return this._lastStatus;
  }

  private async request(action: string, collection: string, body: any = {}) {
    // Session is always local for browser persistence
    if (collection === 'session' || this.mode === 'LOCAL') {
      return this.simulateLocalRequest(action, collection, body);
    }
    
    if (this.mode === 'SUPABASE') {
      try {
        const res = await this.supabaseRequest(action, collection, body);
        // If we made a successful request, connection is definitely OK
        if (this._lastStatus?.ok === false) {
           this.testConnection(); // Re-validate in background to clear error state
        }
        return res;
      } catch (e) {
        console.warn(`Supabase ${action} failed on ${collection}. Falling back to Local Storage.`);
        return this.simulateLocalRequest(action, collection, body);
      }
    }

    return this.mongoRequest(action, collection, body);
  }

  private async supabaseRequest(action: string, collection: string, body: any) {
    const table = collection; 
    const baseUrl = `${CONFIG.SUPABASE_URL}/rest/v1/${table}`;
    const headers = {
      'apikey': CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    if (action === 'find') {
      const query = body.filter?.id ? `?id=eq.${encodeURIComponent(body.filter.id)}` : '';
      const res = await fetch(`${baseUrl}${query}`, { headers });
      if (!res.ok) throw new Error(`Table ${table} not found or inaccessible.`);
      const data = await res.json();
      return { documents: Array.isArray(data) ? data : [data] };
    }

    if (action === 'insertOne') {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(body.document)
      });
      if (!res.ok) throw new Error(`Insert failed on ${table}.`);
      return { insertedId: body.document.id };
    }

    if (action === 'updateOne') {
      const query = `?id=eq.${encodeURIComponent(body.filter.id)}`;
      const res = await fetch(`${baseUrl}${query}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body.update.$set)
      });
      if (!res.ok) throw new Error(`Update failed on ${table}.`);
      return { modifiedCount: 1 };
    }
    
    return {};
  }

  private async mongoRequest(action: string, collection: string, body: any) {
    const endpoint = `https://data.mongodb-api.com/app/${CONFIG.MONGO_APP_ID}/endpoint/data/v1/action/${action}`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': CONFIG.MONGO_API_KEY },
        body: JSON.stringify({ dataSource: CONFIG.CLUSTER, database: CONFIG.DATABASE, collection: collection, ...body }),
      });
      if (!response.ok) return this.simulateLocalRequest(action, collection, body);
      return await response.json();
    } catch (error) {
      return this.simulateLocalRequest(action, collection, body);
    }
  }

  private simulateLocalRequest(action: string, collection: string, body: any) {
    const storageKey = `darshanflow_db_${collection}`;
    let data = JSON.parse(localStorage.getItem(storageKey) || '[]');

    switch (action) {
      case 'find':
        const filter = body.filter || {};
        const filtered = Object.keys(filter).length > 0 
          ? data.filter((d: any) => Object.keys(filter).every(k => d[k] === filter[k]))
          : data;
        return { documents: filtered };

      case 'insertOne':
        data.push(body.document);
        localStorage.setItem(storageKey, JSON.stringify(data));
        return { insertedId: body.document.id };

      case 'updateOne':
        const id = body.filter.id;
        const index = data.findIndex((d: any) => d.id === id);
        const updateSet = body.update.$set;
        
        if (index !== -1) {
          data[index] = { ...data[index], ...updateSet };
        } else {
          // Upsert: Create if missing
          data.push({ id, ...updateSet });
        }
        localStorage.setItem(storageKey, JSON.stringify(data));
        return { modifiedCount: 1 };

      default:
        return {};
    }
  }

  async find(collection: string, filter: any = {}) { return this.request('find', collection, { filter }); }
  async insertOne(collection: string, document: any) { return this.request('insertOne', collection, { document }); }
  async updateOne(collection: string, id: string, update: any) { return this.request('updateOne', collection, { filter: { id }, update: { $set: update } }); }
  
  async bulkPut(collection: string, documents: any[]) {
    if (this.mode === 'LOCAL') {
      localStorage.setItem(`darshanflow_db_${collection}`, JSON.stringify(documents));
    } else {
      for (const doc of documents) await this.insertOne(collection, doc);
    }
  }

  exportData() {
    const collections = ['requests', 'budgetRequests', 'budgetLogs', 'budgets', 'notifications'];
    const bundle: Record<string, any> = {};
    collections.forEach(c => bundle[c] = JSON.parse(localStorage.getItem(`darshanflow_db_${c}`) || '[]'));
    return JSON.stringify(bundle, null, 2);
  }

  importData(jsonString: string) {
    try {
      const bundle = JSON.parse(jsonString);
      Object.keys(bundle).forEach(key => localStorage.setItem(`darshanflow_db_${key}`, JSON.stringify(bundle[key])));
      return true;
    } catch (e) { return false; }
  }
}

export const mongoDB = new DataService();
