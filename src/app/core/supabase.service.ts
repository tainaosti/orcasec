import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/** Cria um único cliente do Supabase para toda a aplicação. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** Falso enquanto o arquivo environment.ts tiver os valores de modelo. */
  readonly configurado =
    /^https:\/\/.+\.supabase\.co$/.test(environment.supabaseUrl) &&
    !environment.supabaseUrl.includes('SEU-PROJETO') &&
    !environment.supabaseAnonKey.includes('SUA-CHAVE');

  readonly client: SupabaseClient = createClient(
    this.configurado ? environment.supabaseUrl : 'https://configurar.supabase.co',
    this.configurado ? environment.supabaseAnonKey : 'chave-nao-configurada',
    { auth: { persistSession: true, autoRefreshToken: true } },
  );
}
