import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Construction } from 'lucide-react';

export default function More() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="w-6 h-6" />
            More
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Halaman ini sedang dalam pengembangan.</p>
        </CardContent>
      </Card>
    </div>
  );
}
