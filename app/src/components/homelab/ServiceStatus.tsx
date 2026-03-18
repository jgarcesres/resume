import { motion } from 'framer-motion';

interface Service {
  name: string;
  category: string;
  status: string;
  icon: string;
}

interface ServiceStatusProps {
  services: Service[];
}

const categoryColors: Record<string, string> = {
  media: 'neon-magenta',
  monitoring: 'neon-gold',
  infra: 'neon-cyan',
  storage: 'neon-green',
  family: 'neon-magenta',
  apps: 'neon-cyan',
};

const statusIndicator: Record<string, { color: string; label: string }> = {
  online: { color: '#39ff14', label: 'ONLINE' },
  offline: { color: '#ff3333', label: 'OFFLINE' },
  degraded: { color: '#ffd700', label: 'DEGRADED' },
};

function ServiceStatus({ services }: ServiceStatusProps) {
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const catServices = services.filter((s) => s.category === cat);
        const accentColor = categoryColors[cat] || 'neon-cyan';

        return (
          <div key={cat}>
            <h3 className={`font-pixel text-[9px] uppercase mb-3 text-${accentColor}`}>
              {cat}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {catServices.map((service, i) => {
                const st = statusIndicator[service.status] || statusIndicator.offline;
                return (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border border-rpg-border/50 bg-rpg-panel/50 p-2.5 flex items-center gap-2 group hover:border-rpg-border-light transition-colors"
                  >
                    <span className="text-sm shrink-0">{service.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-body text-[11px] text-rpg-text block truncate">
                        {service.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: st.color,
                            boxShadow: `0 0 4px ${st.color}`,
                          }}
                        />
                        <span className="font-pixel text-[6px]" style={{ color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ServiceStatus;
