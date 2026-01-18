
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

class DataService {
  get mode() {
    if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY && CONFIG.SUPABASE_URL.includes('supabase.co')) return 'SUPABASE';
    if (CONFIG.MONGO_APP_ID !== 'YOUR_APP_ID' && CONFIG.MONGO_APP_ID.length > 5) return 'MONGODB';
    return 'LOCAL';
  }

  get isLive() {
    return this.mode !== 'LOCAL';
  }

  private async request(action: string, collection: string, body: any = {}) {
    // CRITICAL: 'session' must ALWAYS be local so users don't override each other's login state in the cloud
    if (collection === 'session' || this.mode === 'LOCAL') {
      return this.simulateLocalRequest(action, collection, body);
    }
    
    // Try Cloud
    if (this.mode === 'SUPABASE') {
      try {
        return await this.supabaseRequest(action, collection, body);
      } catch (e) {
        console.warn(`Supabase ${action} failed on ${collection}. Falling back to Local Storage.`, e);
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
      const query = body.filter?.id ? `?id=eq.${body.filter.id}` : '';
      const res = await fetch(`${baseUrl}${query}`, { headers });
      if (!res.ok) throw new Error(`Table ${table} might not exist yet.`);
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
      const query = `?id=eq.${body.filter.id}`;
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
        headers: {
          'Content-Type': 'application/json',
          'api-key': CONFIG.MONGO_API_KEY,
        },
        body: JSON.stringify({
          dataSource: CONFIG.CLUSTER,
          database: CONFIG.DATABASE,
          collection: collection,
          ...body,
        }),
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
        const index = data.findIndex((d: any) => d.id === body.filter.id);
        if (index !== -1) {
          data[index] = { ...data[index], ...body.update.$set };
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
        return { modifiedCount: index !== -1 ? 1 : 0 };

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
    const collections = ['requests', 'budgetRequests', 'budgetLogs', 'budgets'];
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
