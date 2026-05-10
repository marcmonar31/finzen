export default function Legal() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-2xl mx-auto space-y-10 text-sm text-gray-700 leading-relaxed">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Aviso legal</h1>
          <p className="text-xs text-gray-400">Última actualización: mayo 2026</p>
        </div>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">1. Descripción del servicio</h2>
          <p>
            Finzen es una aplicación de gestión de finanzas personales. Permite registrar ingresos, gastos,
            transferencias y seguimiento de inversiones. El servicio se ofrece tal cual, sin garantías de exactitud
            financiera. No somos asesores financieros.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">2. Datos personales</h2>
          <p>
            Los datos que introduces (cuentas, movimientos, objetivos) se almacenan en servidores seguros y
            solo son accesibles por ti. No vendemos ni compartimos tus datos con terceros. La autenticación
            se gestiona vía Supabase, que cumple con el RGPD.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">3. Cookies</h2>
          <p>
            Usamos únicamente cookies de sesión necesarias para el funcionamiento de la aplicación.
            No usamos cookies de seguimiento ni publicidad.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">4. Limitación de responsabilidad</h2>
          <p>
            Finzen no se responsabiliza de decisiones financieras tomadas basándose en los datos de la app.
            Los cálculos de inversiones, predicciones y salud financiera son orientativos.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-2">5. Contacto</h2>
          <p>
            Para cualquier consulta sobre privacidad o el servicio:{" "}
            <a href="mailto:hola@finzen.app" className="text-indigo-600 underline">hola@finzen.app</a>
          </p>
        </section>
      </div>
    </div>
  );
}
