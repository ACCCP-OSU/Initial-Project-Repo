import "server-only";

import * as saml from "samlify";
import samlValidator from "@authenio/samlify-node-xmllint";

import { assertSamlConfigured, config } from "@/lib/config";

saml.setSchemaValidator(samlValidator);

function normalizeCert(certificate: string): string {
  return certificate.replace(/\\n/g, "\n").trim();
}

function buildServiceProvider() {
  return saml.ServiceProvider({
    entityID: config.saml.spEntityId,
    assertionConsumerService: [
      {
        Binding: saml.Constants.namespace.binding.post,
        Location: config.saml.spAcsUrl
      }
    ]
  });
}

function buildIdentityProvider() {
  return saml.IdentityProvider({
    entityID: config.saml.idpEntityId,
    singleSignOnService: [
      {
        Binding: saml.Constants.namespace.binding.redirect,
        Location: config.saml.idpSsoUrl
      }
    ],
    signingCert: normalizeCert(config.saml.idpCert)
  });
}

function getAttribute(attributes: Record<string, unknown>, key: string): string | null {
  const value = attributes[key];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

export async function createSamlLoginRedirect(relayState?: string): Promise<string> {
  assertSamlConfigured();
  const sp = buildServiceProvider();
  const idp = buildIdentityProvider();
  const { context } = await sp.createLoginRequest(idp, "redirect", relayState ? { relayState } : undefined);
  return context;
}

export async function parseSamlCallback(body: Record<string, string>): Promise<{
  externalId: string;
  email: string;
  displayName: string | null;
}> {
  assertSamlConfigured();
  const sp = buildServiceProvider();
  const idp = buildIdentityProvider();

  const parsed = await sp.parseLoginResponse(idp, "post", { body });
  const extract = parsed.extract;
  const attributes = (extract.attributes ?? {}) as Record<string, unknown>;

  const externalId =
    getAttribute(attributes, config.saml.attributeUid) ??
    extract.nameID ??
    getAttribute(attributes, config.saml.attributeEmail);
  const email = getAttribute(attributes, config.saml.attributeEmail);
  const displayName = getAttribute(attributes, config.saml.attributeName);

  if (!externalId || !email) {
    throw new Error("SAML assertion is missing required uid/email attributes.");
  }

  return {
    externalId,
    email,
    displayName
  };
}
