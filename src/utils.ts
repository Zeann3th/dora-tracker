/**
 * The problem with reading version can be solved by making the v at the start optional /^[vV]? and append to string if it does not have "v" or "V". This however, is YET TO BE IMPLEMENTED
 *
 */

export const UAT_REG_EXP =
  /^[vV]?\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?\s\((\d{4}-\d{2}-\d{2})\)$/;

export const PROD_REG_EXP =
  /^[vV]\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?\s\((\d{2})h(\d{2}),\s(\d{4}-\d{2}-\d{2})\)$/;

export const GH_RELEASE_REG_EXP =
  /github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/]+)/;
