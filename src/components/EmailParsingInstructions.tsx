import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

export default function EmailParsingInstructions() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">i</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Email Parsing Instructions
            </h3>
            <p className="text-sm text-blue-700">
              For best results, ensure emails contain structured data with clear field labels
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-4 text-sm text-blue-700">
          <h4 className="font-medium mb-2">Supported Email Formats:</h4>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li><strong>CognitoForms:</strong> Automatically parsed from notifications@cognitoforms.com</li>
            <li><strong>Key-Value Pairs:</strong> "Business Name: ABC Company"</li>
            <li><strong>HTML Tables:</strong> Structured table data with field labels</li>
            <li><strong>Line Format:</strong> Each field on separate lines</li>
          </ul>
          
          <h4 className="font-medium mb-2">Required Fields for Successful Parsing:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Company Name:</strong>
              <ul className="list-disc list-inside ml-4 text-xs">
                <li>Business Name</li>
                <li>Company Name</li>
                <li>Legal Business Name</li>
                <li>Organization Name</li>
              </ul>
            </div>
            <div>
              <strong>Loan Amount:</strong>
              <ul className="list-disc list-inside ml-4 text-xs">
                <li>Loan Amount</li>
                <li>Funding Amount</li>
                <li>Amount Requested</li>
                <li>Capital Needed</li>
              </ul>
            </div>
            <div>
              <strong>Contact Email:</strong>
              <ul className="list-disc list-inside ml-4 text-xs">
                <li>Email Address</li>
                <li>Contact Email</li>
                <li>Business Email</li>
              </ul>
            </div>
            <div>
              <strong>Phone Number:</strong>
              <ul className="list-disc list-inside ml-4 text-xs">
                <li>Phone Number</li>
                <li>Contact Phone</li>
                <li>Business Phone</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
            <h5 className="font-medium text-blue-800 mb-1">Example Email Format:</h5>
            <pre className="text-xs text-blue-700 whitespace-pre-wrap">
{`Business Name: GoKapital Solutions LLC
Email Address: contact@gokapital.com
Phone Number: (555) 123-4567
Loan Amount: $250,000
Purpose: Equipment Purchase`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}