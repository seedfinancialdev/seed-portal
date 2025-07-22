          {/* Pricing Summary Card */}
          <Card className="bg-white shadow-xl border-0 quote-card">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-[#e24c00] to-[#ff6b35] rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Pricing Summary
                  </h2>
                  <p className="text-sm text-gray-500">Your calculated quote breakdown</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Combined Total Card */}
                {(feeCalculation.includesBookkeeping && feeCalculation.includesTaas) && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <Calculator className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-purple-800">Combined Total</h4>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-sm"
                        onClick={() => copyToClipboard(feeCalculation.combined.monthlyFee.toLocaleString(), 'combined')}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="text-3xl font-bold text-purple-800 mb-2">
                      ${feeCalculation.combined.monthlyFee.toLocaleString()} / mo
                    </div>
                    <div className="text-xl font-semibold text-purple-700 mb-2">
                      ${feeCalculation.combined.setupFee.toLocaleString()} total setup
                    </div>
                    <p className="text-sm text-purple-600">
                      Complete bookkeeping and tax services package
                    </p>
                  </div>
                )}

                {/* Single Service Total */}
                {(feeCalculation.includesBookkeeping && !feeCalculation.includesTaas) && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-800">Bookkeeping Package Total</h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-sm"
                        onClick={() => copyToClipboard(feeCalculation.bookkeeping.monthlyFee.toLocaleString(), 'bookkeeping')}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="text-3xl font-bold text-green-800 mb-2">
                      ${feeCalculation.bookkeeping.monthlyFee.toLocaleString()} / mo
                    </div>
                    <div className="text-xl font-semibold text-green-700">
                      ${feeCalculation.bookkeeping.setupFee.toLocaleString()} setup fee
                    </div>
                  </div>
                )}

                {(!feeCalculation.includesBookkeeping && feeCalculation.includesTaas) && (
                  <div className="bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-blue-800">TaaS Package Total</h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm"
                        onClick={() => copyToClipboard(feeCalculation.taas.monthlyFee.toLocaleString(), 'taas')}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="text-3xl font-bold text-blue-800 mb-2">
                      ${feeCalculation.taas.monthlyFee.toLocaleString()} / mo
                    </div>
                    <div className="text-xl font-semibold text-blue-700">
                      ${feeCalculation.taas.setupFee.toLocaleString()} prior years fee
                    </div>
                  </div>
                )}

                {/* No Services Selected */}
                {(!feeCalculation.includesBookkeeping && !feeCalculation.includesTaas) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                    <div className="text-gray-500 mb-2">
                      <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    </div>
                    <h4 className="font-semibold text-gray-600 mb-1">No Services Selected</h4>
                    <p className="text-sm text-gray-500">Click on the service cards above to start building your quote</p>
                  </div>
                )}

                {/* Calculation Breakdown */}
                {isCalculated && (feeCalculation.includesBookkeeping || feeCalculation.includesTaas) && (
                  <div className="border-t pt-6">
                    <button
                      type="button"
                      onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                      className="flex items-center gap-2 mb-4 w-full text-left hover:bg-gray-50 p-2 rounded-md transition-colors"
                    >
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <h3 className="text-lg font-bold text-gray-800 flex-1">
                        Calculation Breakdown
                      </h3>
                      <div className={`transition-transform duration-200 ${isBreakdownExpanded ? 'rotate-180' : ''}`}>
                        <ArrowUpDown className="h-4 w-4 text-gray-500" />
                      </div>
                    </button>
                    
                    {isBreakdownExpanded && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {feeCalculation.includesBookkeeping && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="font-medium text-green-800 mb-2">Bookkeeping Service</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-green-600">Monthly Fee:</span>
                                <span className="font-medium text-green-800">${feeCalculation.bookkeeping.monthlyFee.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-600">Setup/Cleanup Fee:</span>
                                <span className="font-medium text-green-800">${feeCalculation.bookkeeping.setupFee.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {feeCalculation.includesTaas && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="font-medium text-blue-800 mb-2">Tax as a Service (TaaS)</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-blue-600">Monthly Fee:</span>
                                <span className="font-medium text-blue-800">${feeCalculation.taas.monthlyFee.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-600">Prior Years Fee:</span>
                                <span className="font-medium text-blue-800">${feeCalculation.taas.setupFee.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {feeCalculation.includesBookkeeping && feeCalculation.includesTaas && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="font-medium text-gray-800 mb-2">Combined Total</div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between font-semibold">
                                <span className="text-gray-600">Total Monthly:</span>
                                <span className="text-gray-800">${feeCalculation.combined.monthlyFee.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span className="text-gray-600">Total Setup:</span>
                                <span className="text-gray-800">${feeCalculation.combined.setupFee.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 space-y-3">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => {
                        console.log('Save button clicked');
                        console.log('Form values:', form.getValues());
                        console.log('Form errors:', form.formState.errors);
                        form.handleSubmit(onSubmit)();
                      }}
                      disabled={createQuoteMutation.isPending || !isCalculated}
                      className="flex-1 bg-[#253e31] text-white font-semibold py-4 px-6 rounded-lg hover:bg-[#253e31]/90 active:bg-[#253e31]/80 focus:ring-2 focus:ring-[#e24c00] focus:ring-offset-2 button-shimmer transition-all duration-300"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {createQuoteMutation.isPending ? 'Saving...' : (editingQuoteId ? 'Update Quote' : 'Save Quote')}
                    </Button>
                    
                    {(editingQuoteId || hasUnsavedChanges) && (
                      <Button
                        type="button"
                        onClick={resetForm}
                        variant="outline"
                        className="px-4 py-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  
                  {/* HubSpot Integration Button */}
                  {isCalculated && (
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        onClick={async () => {
                          // Auto-save the quote first, then push to HubSpot
                          if (!editingQuoteId && hasUnsavedChanges) {
                            // Save the quote first
                            const formData = form.getValues();
                            try {
                              await new Promise((resolve, reject) => {
                                createQuoteMutation.mutate(formData, {
                                  onSuccess: (savedQuote) => {
                                    // Now push to HubSpot
                                    pushToHubSpotMutation.mutate(savedQuote.id);
                                    resolve(savedQuote);
                                  },
                                  onError: reject
                                });
                              });
                            } catch (error) {
                              console.error('Failed to save quote before pushing to HubSpot:', error);
                            }
                          } else if (editingQuoteId) {
                            // Update existing quote in HubSpot
                            updateHubSpotMutation.mutate(editingQuoteId);
                          }
                        }}
                        disabled={
                          !isCalculated || 
                          hubspotVerificationStatus !== 'verified' || 
                          pushToHubSpotMutation.isPending || 
                          updateHubSpotMutation.isPending ||
                          createQuoteMutation.isPending
                        }
                        className="flex-1 bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-orange-700 active:bg-orange-800 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 button-shimmer transition-all duration-300"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {pushToHubSpotMutation.isPending || updateHubSpotMutation.isPending || (createQuoteMutation.isPending && !editingQuoteId)
                          ? 'Pushing to HubSpot...' 
                          : editingQuoteId 
                            ? 'Update in HubSpot' 
                            : 'Push to HubSpot'
                        }
                      </Button>
                    </div>
                  )}
                  
                  {hubspotVerificationStatus === 'not-found' && isCalculated && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        Contact not found in HubSpot. Please verify the email address or add the contact to HubSpot before pushing.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {editingQuoteId && (
                    <Alert>
                      <Edit className="h-4 w-4" />
                      <AlertDescription>
                        Editing existing quote (ID: {editingQuoteId}). Changes will update the original quote.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {hasUnsavedChanges && !editingQuoteId && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You have unsaved changes. Remember to save your quote before leaving.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="text-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-xs font-medium text-gray-600">
                        Quote valid for 30 days
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Generated on {new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quote History Section */}
        <Card className="bg-white shadow-xl mt-8 border-0 quote-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Saved Quotes
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage and review your quote history</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by contact email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 bg-white border-gray-300 focus:ring-[#e24c00] focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {dontShowArchiveDialog && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDontShowArchiveDialog(false);
                    localStorage.removeItem('dontShowArchiveDialog');
                    toast({
                      title: "Archive Confirmations Enabled",
                      description: "Archive confirmation dialogs will now be shown again.",
                    });
                  }}
                  className="text-xs"
                >
                  Enable Archive Confirmations
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allQuotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No quotes found. Create your first quote above!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('contactEmail')}
                      >
                        <div className="flex items-center gap-1">
                          Contact Email
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('updatedAt')}
                      >
                        <div className="flex items-center gap-1">
                          Last Updated
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('monthlyFee')}
                      >
                        <div className="flex items-center gap-1">
                          Monthly Fee
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 select-none"
                        onClick={() => handleSort('setupFee')}
                      >
                        <div className="flex items-center gap-1">
                          Setup Fee
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allQuotes.map((quote) => (
                      <TableRow 
                        key={quote.id} 
                        className="cursor-pointer quote-table-row"
                        onClick={() => loadQuoteIntoForm(quote)}
                      >
                        <TableCell className="font-medium">{quote.contactEmail}</TableCell>
                        <TableCell>
                          {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-semibold">${parseFloat(quote.monthlyFee).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-[#e24c00]">${parseFloat(quote.setupFee).toLocaleString()}</TableCell>
                        <TableCell>{quote.industry}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleArchiveQuote(quote.id, quote.contactEmail, e)}
                            disabled={archiveQuoteMutation.isPending}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            title="Archive Quote"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white text-sm opacity-80">
            Internal Tool • Seed Financial Sales Team
          </p>
        </div>
      </div>
      
      {/* Approval Code Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Approval Code</DialogTitle>
            <DialogDescription>
              Enter the 4-digit approval code from Slack to unlock cleanup month editing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="approvalCode" className="block text-sm font-medium text-gray-700 mb-2">
                Approval Code
              </label>
              <Input
                id="approvalCode"
                type="text"
                maxLength={4}
                placeholder="0000"
                value={approvalCode}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setApprovalCode(value);
                }}
                className="text-center text-2xl tracking-widest font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && approvalCode.length === 4) {
                    validateApprovalCode();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsApprovalDialogOpen(false);
                  setApprovalCode("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={validateApprovalCode}
                disabled={isValidatingCode || approvalCode.length !== 4}
                className="flex-1"
              >
                {isValidatingCode ? "Validating..." : "Validate Code"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive the quote for {selectedQuoteForArchive?.email}? 
              This will hide it from the main list but preserve it for auditing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center space-x-2 my-4">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowArchiveDialog}
              onCheckedChange={handleArchiveDialogDontShow}
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Don't show this dialog again
            </label>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setArchiveDialogOpen(false);
              setSelectedQuoteForArchive(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmArchive}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Archive Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetConfirmDialog} onOpenChange={setResetConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Quote</AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsavedChanges 
                ? "You have unsaved changes. Are you sure you want to start a new quote? All current data will be lost."
                : "Are you sure you want to start a new quote? This will clear all current data."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setResetConfirmDialog(false);
                doResetForm();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Start New Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Changes Dialog */}
      <AlertDialog open={discardChangesDialog} onOpenChange={setDiscardChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load Quote</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to load this quote? All current data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingQuoteToLoad(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setDiscardChangesDialog(false);
                if (pendingQuoteToLoad) {
                  doLoadQuote(pendingQuoteToLoad);
                  setPendingQuoteToLoad(null);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              Load Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
