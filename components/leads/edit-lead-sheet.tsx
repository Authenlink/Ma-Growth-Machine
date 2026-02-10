"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface LeadDetail {
  id: number;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  position: string | null;
  linkedinUrl: string | null;
  seniority: string | null;
  functional: string | null;
  email: string | null;
  emailCertainty: string | null;
  personalEmail: string | null;
  phoneNumbers: string[] | null;
  city: string | null;
  state: string | null;
  country: string | null;
  iceBreaker: string | null;
  status: string | null;
  validated: boolean;
  reason: string | null;
}

interface EditLeadSheetProps {
  lead: LeadDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditLeadSheet({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: EditLeadSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [seniority, setSeniority] = useState("");
  const [functional, setFunctional] = useState("");
  const [email, setEmail] = useState("");
  const [emailCertainty, setEmailCertainty] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [phoneNumbersText, setPhoneNumbersText] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [iceBreaker, setIceBreaker] = useState("");
  const [status, setStatus] = useState("");
  const [validated, setValidated] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && lead) {
      setFirstName(lead.firstName ?? "");
      setLastName(lead.lastName ?? "");
      setFullName(lead.fullName ?? "");
      setPosition(lead.position ?? "");
      setLinkedinUrl(lead.linkedinUrl ?? "");
      setSeniority(lead.seniority ?? "");
      setFunctional(lead.functional ?? "");
      setEmail(lead.email ?? "");
      setEmailCertainty(lead.emailCertainty ?? "");
      setPersonalEmail(lead.personalEmail ?? "");
      setPhoneNumbersText(
        lead.phoneNumbers && lead.phoneNumbers.length > 0
          ? lead.phoneNumbers.join("\n")
          : ""
      );
      setCity(lead.city ?? "");
      setState(lead.state ?? "");
      setCountry(lead.country ?? "");
      setIceBreaker(lead.iceBreaker ?? "");
      setStatus(lead.status ?? "");
      setValidated(lead.validated ?? false);
      setReason(lead.reason ?? "");
    }
  }, [open, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const phoneNumbers = phoneNumbersText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          fullName: fullName.trim() || null,
          position: position.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          seniority: seniority.trim() || null,
          functional: functional.trim() || null,
          email: email.trim() || null,
          emailCertainty: emailCertainty.trim() || null,
          personalEmail: personalEmail.trim() || null,
          phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : null,
          city: city.trim() || null,
          state: state.trim() || null,
          country: country.trim() || null,
          iceBreaker: iceBreaker.trim() || null,
          status: status.trim() || null,
          validated,
          reason: reason.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      toast.success("Modifications enregistrées");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Modifier le lead</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Informations personnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Poste</Label>
                  <Input
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="CEO"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">URL LinkedIn</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seniority">Seniorité</Label>
                    <Input
                      id="seniority"
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Senior"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="functional">Fonctionnel</Label>
                    <Input
                      id="functional"
                      value={functional}
                      onChange={(e) => setFunctional(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Sales"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="john@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailCertainty">Certitude email</Label>
                    <Input
                      id="emailCertainty"
                      value={emailCertainty}
                      onChange={(e) => setEmailCertainty(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="sure"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Email personnel</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={personalEmail}
                    onChange={(e) => setPersonalEmail(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="john@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumbers">Téléphones (un par ligne)</Label>
                  <Textarea
                    id="phoneNumbers"
                    value={phoneNumbersText}
                    onChange={(e) => setPhoneNumbersText(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="+33 6 12 34 56 78"
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Paris"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Région</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Île-de-France"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="France"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Marketing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Marketing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="iceBreaker">Ice Breaker</Label>
                  <Textarea
                    id="iceBreaker"
                    value={iceBreaker}
                    onChange={(e) => setIceBreaker(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Point d'accroche pour la prospection..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Input
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="En cours"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="validated"
                    checked={validated}
                    onCheckedChange={setValidated}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="validated">Validé</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Raison</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <SheetFooter className="border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
